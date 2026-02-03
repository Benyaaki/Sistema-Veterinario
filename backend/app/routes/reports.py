from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Optional
from app.models.sale import Sale
from app.models.stock import Stock
from app.models.product import Product
from app.models.tutor import Tutor
from app.models.patient import Patient
from app.models.consultation import Consultation
from app.models.branch import Branch
from app.routes.auth import get_current_user
from app.models.user import User
from datetime import datetime
from beanie.operators import In, And
import math
from pydantic import BaseModel
import traceback

router = APIRouter()

# --- Helper Functions ---

def parse_date(date_str: str, end_of_day: bool = False) -> datetime:
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        if end_of_day:
            return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        return dt  # Assume start of day if just a date string usually
    except ValueError:
        # Fallback for YYYY-MM-DD
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        if end_of_day:
            return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        return dt

async def get_valid_branches(user: User) -> List[str]:
    if "admin" in user.roles or "superadmin" in user.roles:
        branches = await Branch.find_all().to_list()
        return [str(b.id) for b in branches]
    
    if user.branch_id:
        return [str(user.branch_id)]
    
    return []

# --- Endpoints ---

@router.get("/dashboard")
async def dashboard_stats(
    start_date: str,
    end_date: str,
    user: User = Depends(get_current_user)
):
    try:
        start_dt = parse_date(start_date)
        end_dt = parse_date(end_date, end_of_day=True)

        # 1. Sales Query
        s_query = [
            Sale.created_at >= start_dt,
            Sale.created_at <= end_dt,
            Sale.status == "COMPLETED"
        ]
        
        # Admin check for data scope (if restricted) - dashboard usually shows all for admin, local for others
        if "admin" not in user.roles and "superadmin" not in user.roles:
            if user.branch_id:
                s_query.append(Sale.branch_id == user.branch_id)
        
        sales = await Sale.find(*s_query).to_list()
        
        # 2. Appointments Query
        c_query = [
            Consultation.date >= start_dt,
            Consultation.date <= end_dt
        ]
        if "admin" not in user.roles and "superadmin" not in user.roles:
            if user.branch_id:
                c_query.append(Consultation.branch_id == user.branch_id)
                
        # For "Pending", typically we want scheduled ones. 
        # But if the dashboard requested "Today", maybe it just wants count of appointments today?
        # The UI label is "Citas Pendientes" (Pending Appointments). 
        # Let's count *Scheduled* appointments in the range.
        c_query.append(Consultation.status == "scheduled")
        
        appointments = await Consultation.find(*c_query).to_list()

        # 3. Aggregations
        global_stats = {
            "sales": sum((s.total or 0) for s in sales),
            "transactions": len(sales),
            "appointments": len(appointments)
        }

        # 4. By Branch
        branches = await Branch.find_all().to_list()
        branch_map = {str(b.id): b.name for b in branches if b.id}
        
        by_branch_data = {}
        
        # Process Sales
        for s in sales:
            bid = str(s.branch_id) if s.branch_id else "unknown"
            b_name = branch_map.get(bid, "Desconocido")
            
            if bid not in by_branch_data:
                by_branch_data[bid] = {"branch_id": bid, "name": b_name, "sales": 0, "transactions": 0, "appointments": 0}
            
            by_branch_data[bid]["sales"] += (s.total or 0)
            by_branch_data[bid]["transactions"] += 1
            
        # Process Appointments
        for c in appointments:
            bid = str(c.branch_id) if c.branch_id else "unknown"
            b_name = branch_map.get(bid, "Desconocido")
            
            if bid not in by_branch_data:
                 by_branch_data[bid] = {"branch_id": bid, "name": b_name, "sales": 0, "transactions": 0, "appointments": 0}
            
            by_branch_data[bid]["appointments"] += 1
            
        return {
            "global": global_stats,
            "branches": list(by_branch_data.values())
        }

    except Exception as e:
        print("CRITICAL ERROR IN /DASHBOARD REPORT:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sales")
async def sales_report(
    start: str, 
    end: str, 
    user: User = Depends(get_current_user)
):
    try:
        if "admin" not in user.roles and "superadmin" not in user.roles:
             if not user.branch_id:
                raise HTTPException(status_code=403, detail="Not authorized")

        start_dt = parse_date(start)
        end_dt = parse_date(end, end_of_day=True)

        # 1. Base Query
        query = [
            Sale.created_at >= start_dt,
            Sale.created_at <= end_dt,
            Sale.status == "COMPLETED"
        ]
        
        # 2. Branch Filtering
        if "admin" not in user.roles and "superadmin" not in user.roles:
            query.append(Sale.branch_id == user.branch_id)

        sales = await Sale.find(*query).to_list()

        total_sales = sum((s.total or 0) for s in sales)
        count = len(sales)
        avg_ticket = total_sales / count if count > 0 else 0

        # 3. By Day
        by_day_map = {}
        for s in sales:
            if not s.created_at: continue
            day_str = s.created_at.strftime("%Y-%m-%d")
            
            if day_str not in by_day_map:
                by_day_map[day_str] = {"date": day_str, "total": 0, "count": 0}
            
            by_day_map[day_str]["total"] += (s.total or 0)
            by_day_map[day_str]["count"] += 1
        
        by_day = sorted(by_day_map.values(), key=lambda x: x["date"])

        # 4. By Product (Analyze items)
        by_product_map = {}
        for s in sales:
            if not s.items: continue
            for item in s.items:
                key = item.name or "Desconocido"
                if key not in by_product_map:
                    by_product_map[key] = {"name": key, "total": 0, "count": 0}
                
                by_product_map[key]["total"] += (item.total or 0)
                by_product_map[key]["count"] += (item.quantity or 0)
        
        # Sort by quantity sold
        by_product = sorted(
            [{"name": k, "quantity": v["count"]} for k, v in by_product_map.items()],
            key=lambda x: x["quantity"], 
            reverse=True
        )[:5]

        # 5. By Branch
        # Pre-fetch branches safely
        branches = await Branch.find_all().to_list()
        branch_name_map = {}
        for b in branches:
            if b.id:
                branch_name_map[str(b.id)] = b.name

        by_branch_map = {}
        
        for s in sales:
            bid = s.branch_id
            if not bid:
                b_name = "Sin Sucursal"
            else:
                b_name = branch_name_map.get(str(bid), "Desconocida")
            
            if b_name not in by_branch_map:
                 by_branch_map[b_name] = {"name": b_name, "total": 0, "count": 0}
                 
            by_branch_map[b_name]["total"] += (s.total or 0)
            by_branch_map[b_name]["count"] += 1
            
        by_branch = sorted(by_branch_map.values(), key=lambda x: x["total"], reverse=True)

        # 6. By Employee (Top Sellers)
        user_ids_set = set()
        for s in sales:
            if s.created_by:
                user_ids_set.add(s.created_by)
        
        user_name_map = {}
        if user_ids_set:
            # Be precise with types for In query
            users = await User.find(In(User.id, list(user_ids_set))).to_list()
            for u in users:
                user_name_map[str(u.id)] = u.name
        
        by_employee_map = {}
        for s in sales:
            uid = s.created_by
            if not uid: continue

            u_name = user_name_map.get(str(uid), "Desconocido")
            
            if u_name not in by_employee_map:
                by_employee_map[u_name] = {"name": u_name, "total": 0, "transactions": 0}
            
            by_employee_map[u_name]["total"] += (s.total or 0)
            by_employee_map[u_name]["transactions"] += 1
            
        by_employee = sorted(by_employee_map.values(), key=lambda x: x["total"], reverse=True)

        return {
            "total_sales": total_sales,
            "count": count,
            "avg_ticket": int(avg_ticket),
            "by_day": by_day,
            "by_product": by_product,
            "by_branch": by_branch,
            "by_employee": by_employee
        }
    except Exception as e:
        print("CRITICAL ERROR IN /SALES REPORT:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments")
async def appointment_stats(
    start: str,
    end: str,
    user: User = Depends(get_current_user)
):
    try:
        start_dt = parse_date(start)
        end_dt = parse_date(end, end_of_day=True)

        query = [
            Consultation.date >= start_dt,
            Consultation.date <= end_dt
        ]

        # Branch filter
        if "admin" not in user.roles and "superadmin" not in user.roles:
            if user.branch_id:
                 query.append(Consultation.branch_id == user.branch_id)

        consultations = await Consultation.find(*query).to_list()

        total = len(consultations)
        completed = 0
        cancelled = 0
        pending = 0
        
        type_map = {} 

        for c in consultations:
            # Status
            status = c.status
            if status == "attended":
                completed += 1
            elif status == "cancelled" or status == "no_show":
                cancelled += 1
            elif status == "scheduled":
                pending += 1
            
            # Type
            atype = c.appointment_type or "Veterinaria" 
            if atype == "VET": atype = "Veterinaria"
            if atype == "GROOMING": atype = "Peluquería"
            if atype == "VACCINATION": atype = "Vacunación"
            
            type_map[atype] = type_map.get(atype, 0) + 1

        by_type = [{"type": k, "count": v} for k, v in type_map.items()]
        
        # By Branch
        branches = await Branch.find_all().to_list()
        branch_name_map = {}
        for b in branches:
            if b.id:
                 branch_name_map[str(b.id)] = b.name

        by_branch_map = {}
        
        for c in consultations:
            bid = c.branch_id
            b_name = "Sin Sucursal"
            if bid:
                 b_name = branch_name_map.get(str(bid), "Desconocida")
            
            if b_name not in by_branch_map:
                 by_branch_map[b_name] = {"name": b_name, "count": 0}
                 
            by_branch_map[b_name]["count"] += 1

        by_branch = sorted(by_branch_map.values(), key=lambda x: x["count"], reverse=True)

        return {
            "total": total,
            "completed": completed,
            "cancelled": cancelled,
            "pending": pending,
            "by_type": by_type,
            "by_branch": by_branch
        }
    except Exception as e:
        print("CRITICAL ERROR IN /APPOINTMENTS REPORT:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products")
async def product_stats(
    start: str,
    end: str,
    user: User = Depends(get_current_user)
):
    # Total Products
    total_products = await Product.find_all().count()
    
    low_stock_count = 0
    out_of_stock_count = 0
    
    query = []
    if "admin" not in user.roles and "superadmin" not in user.roles:
        if user.branch_id:
             query.append(Stock.branch_id == user.branch_id)
            
    stocks = await Stock.find(*query).to_list()
    
    for s in stocks:
        qty = s.quantity if s.quantity is not None else 0
        if qty == 0:
            out_of_stock_count += 1
        elif qty < 5:
             low_stock_count += 1

    # Top Selling 
    start_dt = parse_date(start)
    end_dt = parse_date(end, end_of_day=True)
    
    s_query = [
        Sale.created_at >= start_dt,
        Sale.created_at <= end_dt,
        Sale.status == "COMPLETED"
    ]
    if "admin" not in user.roles and "superadmin" not in user.roles:
        if user.branch_id:
             s_query.append(Sale.branch_id == user.branch_id)

    sales = await Sale.find(*s_query).to_list()
    
    product_sales_map = {}
    for s in sales:
        if not s.items: continue
        for item in s.items:
            key = item.name or "N/A"
            product_sales_map[key] = product_sales_map.get(key, 0) + (item.quantity or 0)
            
    top_selling = sorted(
        [{"name": k, "quantity": v} for k, v in product_sales_map.items()],
        key=lambda x: x["quantity"], 
        reverse=True
    )[:5]

    return {
        "total_products": total_products,
        "low_stock": low_stock_count,
        "out_of_stock": out_of_stock_count,
        "top_selling": top_selling
    }

@router.get("/clients")
async def client_stats(
    start: str,
    end: str,
    user: User = Depends(get_current_user)
):
    start_dt = parse_date(start)
    end_dt = parse_date(end, end_of_day=True)

    # 1. Total Clients
    total_clients = await Tutor.find_all().count()
    
    # 2. New Clients in Period
    new_clients = await Tutor.find(
        Tutor.created_at >= start_dt,
        Tutor.created_at <= end_dt
    ).count()
    
    # 3. Active Clients
    s_query = [
        Sale.created_at >= start_dt,
        Sale.created_at <= end_dt,
        Sale.status == "COMPLETED",
        Sale.customer_id != None
    ]
    sales = await Sale.find(*s_query).to_list()
    active_tutors = set(s.customer_id for s in sales if s.customer_id)
    
    c_query = [
        Consultation.date >= start_dt,
        Consultation.date <= end_dt
    ]
    consultations = await Consultation.find(*c_query).to_list()
    
    patient_ids = [c.patient_id for c in consultations if c.patient_id]
    if patient_ids:
        patients = await Patient.find(In(Patient.id, patient_ids)).to_list()
        for p in patients:
            if p.tutor_id:
                active_tutors.add(p.tutor_id)

    # 4. Debtor Clients
    debtor_clients = await Tutor.find(Tutor.debt > 0).count()

    # 5. Total Patients
    total_patients = await Patient.find_all().count()

    return {
        "total_clients": total_clients,
        "new_clients": new_clients,
        "active_clients": len(active_tutors),
        "debtor_clients": debtor_clients,
        "total_patients": total_patients
    }

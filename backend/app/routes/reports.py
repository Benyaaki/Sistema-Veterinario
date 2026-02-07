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
from datetime import datetime, timezone
from beanie.operators import In, And
import math
from pydantic import BaseModel
import traceback
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
import io

router = APIRouter()

# --- Helper Functions ---

def parse_date(date_str: str, end_of_day: bool = False) -> datetime:
    if not date_str:
        dt = datetime.now(timezone.utc)
    else:
        try:
            # Try ISO format first (handles Z and offsets)
            fixed_str = date_str.replace('Z', '+00:00')
            dt = datetime.fromisoformat(fixed_str)
            # Ensure it's aware, default to UTC if missing
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            try:
                # Try simple YYYY-MM-DD
                dt = datetime.strptime(date_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except Exception:
                dt = datetime.now(timezone.utc)
    
    # Only override time if it appears to be a date-only string (e.g., "YYYY-MM-DD")
    if len(date_str) <= 10:
        if end_of_day:
            return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    
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
        
        is_admin = "admin" in user.roles or "superadmin" in user.roles or user.role in ["admin", "superadmin"]

        # Admin check for data scope
        # Sales: Admins see Global (or Branch Global). Non-Admins see THEIR OWN sales only.
        if not is_admin:
            if user.branch_id:
                s_query.append(Sale.branch_id == user.branch_id)
            # Filter by Creator (Individual Sales) as requested
            s_query.append(Sale.created_by == user.id)
        
        sales = await Sale.find(*s_query).to_list()
        
        # 2. Appointments Query
        c_query = [
            Consultation.date >= start_dt,
            Consultation.date <= end_dt
        ]
        
        # Appointments: Global for everyone (visible to all in branch)
        if not is_admin:
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
    
    low_stock_items = []
    out_of_stock_items = []
    
    query = []
    if "admin" not in user.roles and "superadmin" not in user.roles:
        if user.branch_id:
             query.append(Stock.branch_id == user.branch_id)
            
    stocks = await Stock.find(*query).to_list()
    
    # Create a map for quantities found in Stock records
    stock_qty_map = {} # product_id -> total_qty
    for s in stocks:
        pid_str = str(s.product_id)
        stock_qty_map[pid_str] = stock_qty_map.get(pid_str, 0) + (s.quantity or 0)

    # Process ALL products to ensure we don't miss those with 0 stock (no Stock record)
    products = await Product.find_all().to_list()
    
    for p in products:
        pid_str = str(p.id)
        qty = stock_qty_map.get(pid_str, 0)
        threshold = getattr(p, 'stock_alert_threshold', 5) or 5
        
        item_info = {
            "id": pid_str,
            "name": p.name,
            "quantity": qty
        }

        if qty <= 0:
            out_of_stock_items.append(item_info)
        elif qty <= threshold:
             low_stock_items.append(item_info)

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
        "low_stock": len(low_stock_items),
        "out_of_stock": len(out_of_stock_items),
        "low_stock_items": low_stock_items,
        "out_of_stock_items": out_of_stock_items,
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

@router.get("/daily-closing-pdf")
async def daily_closing_pdf(
    date: str, # YYYY-MM-DD
    user: User = Depends(get_current_user)
):
    try:
        # 1. Parse Date
        dt_start = datetime.strptime(date, "%Y-%m-%d").replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
        dt_end = dt_start.replace(hour=23, minute=59, second=59, microsecond=999999)

        # 2. Base Query
        # For this report, we follow the same logic as MyDailySales: filter by user unless admin?
        # The user said "person finishes their shift", so it's usually for the logged-in user.
        query = [
            Sale.created_at >= dt_start,
            Sale.created_at <= dt_end,
            Sale.status == "COMPLETED",
            Sale.created_by == user.id
        ]
        
        sales = await Sale.find(*query).sort("created_at").to_list()

        # 3. Aggregations
        totals_by_method = {}
        grand_total = 0
        
        method_labels = {
            "CASH": "Efectivo",
            "DEBIT": "Débito",
            "CREDIT": "Crédito",
            "TRANSFER": "Transferencia",
            "DEBT": "Deudado"
        }

        for s in sales:
            method = method_labels.get(s.payment_method, s.payment_method)
            sales_total = s.total if s.total is not None else 0
            totals_by_method[method] = totals_by_method.get(method, 0) + sales_total
            grand_total += sales_total

        # 4. Generate PDF
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width/2, height - 50, "RESUMEN DE VENTAS DIARIAS")
        
        c.setFont("Helvetica", 10)
        c.drawString(50, height - 80, f"Vendedor: {user.name}")
        c.drawString(50, height - 95, f"Fecha: {date}")
        c.drawString(width - 200, height - 80, f"Generado: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} (UTC)")
        
        # Table Header
        y = height - 130
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "Hora")
        c.drawString(150, y, "Medio de Pago")
        c.drawRightString(width - 50, y, "Total")
        
        c.line(50, y - 5, width - 50, y - 5)
        y -= 25
        
        # Transactions
        c.setFont("Helvetica", 10)
        for s in sales:
            if y < 100: # New page if needed
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 10)

            time_str = s.created_at.strftime("%H:%M") if s.created_at else "N/A"
            method = method_labels.get(s.payment_method, s.payment_method)
            s_total = s.total if s.total is not None else 0
            c.drawString(50, y, time_str)
            c.drawString(150, y, method)
            c.drawRightString(width - 50, y, f"${s_total:,.0f}")
            y -= 20
            
        # Summary
        y -= 20
        c.line(50, y, width - 50, y)
        y -= 25
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, "RESUMEN POR MEDIO")
        y -= 25
        
        c.setFont("Helvetica", 11)
        for method, total in totals_by_method.items():
            c.drawString(70, y, f"{method}:")
            c.drawRightString(width - 50, y, f"${total:,.0f}")
            y -= 20
            
        y -= 10
        c.setFont("Helvetica-Bold", 14)
        c.setStrokeColor(colors.black)
        c.rect(50, y - 10, width - 100, 35, stroke=1, fill=0)
        c.drawString(70, y, "TOTAL GENERAL")
        c.drawRightString(width - 70, y, f"${grand_total:,.0f}")
        
        c.showPage()
        c.save()
        
        buffer.seek(0)
        from fastapi.responses import Response
        user_display_name = user.name if user.name else "usuario"
        safe_name = user_display_name.replace(" ", "_").lower()
        filename = f"cierre_{safe_name}_{date}.pdf"
        return Response(buffer.getvalue(), media_type="application/pdf", headers={
            "Content-Disposition": f"attachment; filename={filename}"
        })

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/sales-by-category")
async def sales_by_category(
    start: str,
    end: str,
    branch_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    try:
        start_dt = parse_date(start)
        end_dt = parse_date(end, end_of_day=True)
        
        query = [
            Sale.created_at >= start_dt,
            Sale.created_at <= end_dt,
            Sale.status == "COMPLETED"
        ]
        
        if branch_id:
            query.append(Sale.branch_id == PydanticObjectId(branch_id))
        elif "admin" not in user.roles and "superadmin" not in user.roles:
            if user.branch_id:
                query.append(Sale.branch_id == user.branch_id)
                
        sales = await Sale.find(*query).to_list()
        
        category_map = {} # category -> {total_amount, items_count, sales_count}
        total_period = 0
        
        for s in sales:
            sale_categories = set()
            for item in s.items:
                cat = item.category or "Sin Categoría"
                if cat not in category_map:
                    category_map[cat] = {"name": cat, "total": 0.0, "items": 0, "sales": 0}
                
                category_map[cat]["total"] += (item.total or 0.0)
                category_map[cat]["items"] += (item.quantity or 0)
                sale_categories.add(cat)
                total_period += (item.total or 0.0)
            
            for cat in sale_categories:
                category_map[cat]["sales"] += 1
                
        # Calculate percentages
        results = list(category_map.values())
        for r in results:
            r["percentage"] = (r["total"] / total_period * 100) if total_period > 0 else 0
            
        return sorted(results, key=lambda x: x["total"], reverse=True)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commissions")
async def commission_report(
    start: str,
    end: str,
    professional_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    try:
        start_dt = parse_date(start)
        end_dt = parse_date(end, end_of_day=True)
        
        query = [
            Sale.created_at >= start_dt,
            Sale.created_at <= end_dt,
            Sale.status == "COMPLETED"
        ]
        
        sales = await Sale.find(*query).to_list()
        
        prof_map = {} # prof_id -> {name, total_sales, items_count}
        
        for s in sales:
            for item in s.items:
                if item.professional_id:
                    pid = str(item.professional_id)
                    if professional_id and pid != professional_id:
                        continue
                        
                    if pid not in prof_map:
                        prof_map[pid] = {
                            "professional_id": pid,
                            "name": item.professional_name or "Desconocido",
                            "total": 0.0,
                            "count": 0
                        }
                    
                    prof_map[pid]["total"] += (item.total or 0.0)
                    prof_map[pid]["count"] += (item.quantity or 0)
                    
        return sorted(list(prof_map.values()), key=lambda x: x["total"], reverse=True)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from app.models.sale import Sale, SaleItem
from app.models.stock import Stock
from app.models.inventory import InventoryMovement
from app.models.delivery import DeliveryOrder
from app.models.product import Product
from app.routes.auth import get_current_user
from app.models.user import User
from beanie import PydanticObjectId, WriteRules
from datetime import datetime, timezone

router = APIRouter()

from pydantic import BaseModel

class SaleCreate(BaseModel):
    branch_id: str
    customer_id: Optional[str] = None
    items: List[SaleItem]
    subtotal: float
    discount_percent: float
    discount_amount: float
    total: float
    payment_method: str
    cash_received: Optional[float] = None
    cash_change: Optional[float] = None
    # Delivery info
    create_delivery: bool = False
    delivery_info: Optional[Dict] = None # shipping_cost, customer_snapshot

@router.post("/", response_model=Sale)
async def create_sale(data: SaleCreate, user: User = Depends(get_current_user)):
    # 1. Prepare Sale Object
    sale = Sale(
        branch_id=PydanticObjectId(data.branch_id),
        customer_id=PydanticObjectId(data.customer_id) if data.customer_id else None,
        items=data.items,
        subtotal=data.subtotal,
        discount_percent=data.discount_percent,
        discount_amount=data.discount_amount,
        total=data.total,
        payment_method=data.payment_method,
        cash_received=data.cash_received,
        cash_change=data.cash_change,
        created_by=user.id,
        created_at=datetime.now(timezone.utc),
        channel="DELIVERY" if data.create_delivery else "STORE",
        status="PENDING_DELIVERY" if data.create_delivery else "COMPLETED"
    )
    
    # 1.5 Handle DEBT Payment
    if sale.payment_method == "DEBT":
        if not sale.customer_id:
            raise HTTPException(status_code=400, detail="Client required for DEBT payment")
        
        # Verify customer exists and update debt
        from app.models.tutor import Tutor
        tutor = await Tutor.get(sale.customer_id)
        if not tutor:
             raise HTTPException(status_code=404, detail="Client not found")
        
        tutor.debt += sale.total
        tutor.total_spent += sale.total # Also count debt creation as spending, or only payment? Usually sale total.
        await tutor.save()
    elif sale.customer_id:
        # Normal sale with customer
        from app.models.tutor import Tutor
        tutor = await Tutor.get(sale.customer_id)
        if tutor:
            tutor.total_spent += sale.total
            await tutor.save()

    # 2. Process Items & Stock
    for item in data.items:
        if item.type == "PRODUCT" and item.product_id:
            # Deduct Stock
            stock = await Stock.find_one(
                Stock.branch_id == sale.branch_id,
                Stock.product_id == item.product_id
            )
            
            if not stock:
                # Should we error? Or create negative?
                if "admin" not in user.roles and "superadmin" not in user.roles:
                    raise HTTPException(status_code=400, detail=f"Stock not found for {item.name}")
                stock = Stock(branch_id=sale.branch_id, product_id=item.product_id, quantity=0)
                await stock.insert()

            if stock.quantity < item.quantity:
                if "admin" not in user.roles and "superadmin" not in user.roles:
                    raise HTTPException(status_code=400, detail=f"Insufficient stock for {item.name}")
            
            stock.quantity -= item.quantity
            await stock.save()
            
    # 3. Save Sale
    await sale.insert()

    # 3. Create Inventory Movements (Now we have sale.id)
    for item in data.items:
        if item.type == "PRODUCT" and item.product_id:
             mov = InventoryMovement(
                 type="SALE",
                 product_id=item.product_id,
                 quantity=item.quantity,
                 from_branch_id=sale.branch_id,
                 reason="Venta POS",
                 reference_sale_id=sale.id,
                 created_by=user.id
             )
             await mov.insert()

    # 4. Handle Delivery
    if data.create_delivery and data.delivery_info:
        delivery = DeliveryOrder(
            sale_id=sale.id,
            branch_id=sale.branch_id,
            status="PENDING",
            shipping_cost=data.delivery_info.get("shipping_cost", 0),
            customer_snapshot=data.delivery_info.get("customer_snapshot", {}),
            scheduled_at=data.delivery_info.get("scheduled_at"),
            assigned_user_id=PydanticObjectId(data.delivery_info.get("assigned_user_id")) if data.delivery_info.get("assigned_user_id") else None
        )
        if delivery.assigned_user_id:
            delivery.status = "ASSIGNED"
        await delivery.insert()

    # 5. Log Activity
    # 5. Log Activity
    from app.services.activity_service import log_activity
    from app.models.branch import Branch
    
    branch = await Branch.get(sale.branch_id)
    await log_activity(
        user=user,
        action_type="SALE",
        description=f"Venta realizada por ${sale.total:,.0f} con {len(sale.items)} producto(s)",
        branch_id=sale.branch_id,
        branch_name=branch.name if branch else None,
        reference_id=str(sale.id),
        metadata={"total": sale.total, "payment_method": sale.payment_method}
    )

    return sale

@router.post("/{id}/void", response_model=Sale)
async def void_sale(id: str, reason: str = "Anulación Admin", user: User = Depends(get_current_user)):
    if "admin" not in user.roles and "superadmin" not in user.roles:
        raise HTTPException(status_code=403, detail="Only Admins can void sales")
    
    sale = await Sale.get(id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    if sale.status == "VOIDED":
        raise HTTPException(status_code=400, detail="Already voided")
    
    # Reverse Stock
    for item in sale.items:
        if item.type == "PRODUCT" and item.product_id:
            stock = await Stock.find_one(
                Stock.branch_id == sale.branch_id,
                Stock.product_id == item.product_id
            )
            if stock:
                stock.quantity += item.quantity
                await stock.save()
                
                # Record Movement
                mov = InventoryMovement(
                     type="VOID_SALE",
                     product_id=item.product_id,
                     quantity=item.quantity,
                     to_branch_id=sale.branch_id,
                     reason=f"Anulación Venta {sale.id}",
                     reference_sale_id=sale.id,
                     created_by=user.id
                )
                await mov.insert()

    sale.status = "VOIDED"
    sale.voided_by = user.id
    sale.voided_at = datetime.utcnow()
    sale.void_reason = reason
    await sale.save()
    
    return sale

async def populate_customer_names(sales: List[Sale]) -> List[Sale]:
    from app.models.tutor import Tutor
    
    # Simple cache to avoid multiple DB calls for same tutor
    tutor_cache = {}
    
    for sale in sales:
        if sale.customer_id:
            # Check cache
            if sale.customer_id in tutor_cache:
                sale.customer_name = tutor_cache[sale.customer_id]
                continue
                
            # Fetch individually (Reliable fallback)
            try:
                tutor = await Tutor.get(sale.customer_id)
                if tutor:
                    sale.customer_name = tutor.full_name
                    tutor_cache[sale.customer_id] = tutor.full_name
                else:
                    # Try string lookup as last resort
                    # (In case ID type mismatch occurred)
                    pass 
            except Exception as e:
                print(f"Error fetching tutor {sale.customer_id}: {e}")
                
    return sales

@router.get("/", response_model=List[Sale])
async def get_sales(limit: int = 50, user: User = Depends(get_current_user)):
    sales = await Sale.find_all().sort("-created_at").limit(limit).to_list()
    return await populate_customer_names(sales)

@router.get("/my", response_model=List[Sale])
async def get_my_sales(
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    user: User = Depends(get_current_user)
):
    # History Limit Logic
    from datetime import timedelta
    now_utc = datetime.now(timezone.utc)
    
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except ValueError:
            pass # Fallback or error handling
            
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            pass

    # If no specific dates provided, default to logic:
    if not start_dt:
        if "admin" in user.roles or "superadmin" in user.roles:
             # Admins: Last 30 days
             start_dt = now_utc - timedelta(days=30)
        else:
             # Sellers: Today Only (UTC day baseline)
             start_dt = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

    # Construct Query
    query = [Sale.created_by == user.id, Sale.status == "COMPLETED"]
    
    if start_dt:
        query.append(Sale.created_at >= start_dt)
    
    if end_dt:
        query.append(Sale.created_at <= end_dt)

    # Filter by created_by AND date
    sales = await Sale.find(*query).sort("-created_at").to_list()
    
    return await populate_customer_names(sales)

@router.get("/{id}", response_model=Sale)
async def get_sale_by_id(id: str, user: User = Depends(get_current_user)):
    sale = await Sale.get(id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Populate customer name if needed
    if sale.customer_id:
        from app.models.tutor import Tutor
        tutor = await Tutor.get(sale.customer_id)
        if tutor:
            sale.customer_name = tutor.full_name
            
    return sale

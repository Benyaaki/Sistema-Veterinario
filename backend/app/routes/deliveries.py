from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from typing import List
from app.models.delivery import DeliveryOrder
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.sale import Sale
from beanie import PydanticObjectId

from typing import List, Optional, Dict
from pydantic import BaseModel

router = APIRouter()

@router.get("/", response_model=List[DeliveryOrder])
async def get_deliveries(status: str = None, user: User = Depends(get_current_user)):
    query = DeliveryOrder.find_all()
    
    # If delivery role, maybe only show assigned or unassigned?
    # Prompt: "Repartidor ve pedidos asingados"
    if "delivery" in user.roles and "admin" not in user.roles:
        # Show assigned to ME or PENDING (to pick up?) - usually assigned.
        # "asignación y estados para repartidor".
        query = query.find({"$or": [{"assigned_user_id": user.id}, {"status": "PENDING"}]}) 
    elif status:
        query = query.find(DeliveryOrder.status == status)
        
    deliveries = await query.sort("-created_at").to_list()
    
    # Populate Sale Info manually (Beanie doesn't define relations automatically unless configured)
    results = []
    for d in deliveries:
        d_dict = d.dict()
        if d.sale_id:
            sale = await Sale.get(d.sale_id)
            if sale:
                # Add sale details to the response dict check
                d_dict['sale_details'] = jsonable_encoder(sale)
                # Populate customer name if missing in snapshot but present in sale
                if not d.customer_snapshot and sale.customer_name:
                     d_dict['customer_snapshot'] = {"name": sale.customer_name}
        results.append(d_dict)

    return results

@router.put("/{id}/status", response_model=DeliveryOrder)
async def update_delivery_status(id: str, status: str, user: User = Depends(get_current_user)):
    order = await DeliveryOrder.get(id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Permission check
    if "delivery" not in user.roles and "admin" not in user.roles:
         raise HTTPException(status_code=403, detail="Not authorized")
    
    order.status = status
    await order.save()

    # Sync with Sale
    if order.sale_id and status == "DELIVERED":
        sale = await Sale.get(order.sale_id)
        if sale and sale.status == "PENDING_DELIVERY":
            sale.status = "COMPLETED"
            await sale.save()
            
    return order

@router.put("/{id}/assign", response_model=DeliveryOrder)
async def assign_delivery(id: str, user_id: str, user: User = Depends(get_current_user)):
    if "admin" not in user.roles and "superadmin" not in user.roles:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    order = await DeliveryOrder.get(id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.assigned_user_id = PydanticObjectId(user_id)
    order.status = "ASSIGNED"
    await order.save()
    return order

@router.delete("/{id}")
async def delete_delivery(id: str, user: User = Depends(get_current_user)):
    if "admin" not in user.roles and "superadmin" not in user.roles:
         raise HTTPException(status_code=403, detail="Not authorized")
    
    order = await DeliveryOrder.get(id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Void the Sale to return stock
    if order.sale_id:
        sale = await Sale.get(order.sale_id)
        if sale and sale.status != "VOIDED":
            # Call void logic logic manualy since we are in different router
            # Reverse Stock
            from app.models.stock import Stock
            from app.models.inventory import InventoryMovement
            from datetime import datetime

            for item in sale.items:
                if item.type == "PRODUCT" and item.product_id:
                    stock = await Stock.find_one(
                        Stock.branch_id == sale.branch_id,
                        Stock.product_id == item.product_id
                    )
                    if stock:
                        stock.quantity += item.quantity
                        await stock.save()
                        
                        mov = InventoryMovement(
                             type="VOID_SALE",
                             product_id=item.product_id,
                             quantity=item.quantity,
                             to_branch_id=sale.branch_id,
                             reason=f"Despacho Eliminado {order.id}",
                             reference_sale_id=sale.id,
                             created_by=user.id
                        )
                        await mov.insert()
            
            sale.status = "VOIDED"
            sale.voided_by = user.id
            sale.voided_at = datetime.utcnow()
            sale.void_reason = "Despacho Cancelado"
            await sale.save()

    await order.delete()
    return {"message": "Delivery deleted and sale voided"}

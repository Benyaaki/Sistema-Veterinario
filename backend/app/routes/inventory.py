from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from beanie import PydanticObjectId
from app.models.stock import Stock
from app.models.inventory import InventoryMovement
from app.models.product import Product
from app.routes.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/stock")
async def get_stock(
    branch_id: Optional[str] = None,
    product_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    query = Stock.find_all()
    if branch_id:
        query = query.find(Stock.branch_id == PydanticObjectId(branch_id))
    if product_id:
        query = query.find(Stock.product_id == PydanticObjectId(product_id))
    
    # Enrich with product name? Frontend might like that, or fetch separately.
    # For now, return raw stock objects.
    return await query.to_list()

from pydantic import BaseModel

class InventoryMovementCreate(BaseModel):
    type: str
    product_id: str
    quantity: int
    from_branch_id: Optional[str] = None
    to_branch_id: Optional[str] = None
    reason: str
    reference_sale_id: Optional[str] = None

@router.post("/movements", response_model=InventoryMovement)
async def create_movement(data: InventoryMovementCreate, user: User = Depends(get_current_user)):
    # Validate Permissions
    if "sales" not in user.roles and "admin" not in user.roles:
         raise HTTPException(status_code=403, detail="Not authorized")

    # Prepare Document Data
    doc_data = data.model_dump()
    doc_data["product_id"] = PydanticObjectId(data.product_id)
    if data.from_branch_id:
        doc_data["from_branch_id"] = PydanticObjectId(data.from_branch_id)
    if data.to_branch_id:
        doc_data["to_branch_id"] = PydanticObjectId(data.to_branch_id)
    if data.reference_sale_id:
        doc_data["reference_sale_id"] = PydanticObjectId(data.reference_sale_id)
    
    # Create Document instance
    movement = InventoryMovement(
        **doc_data,
        created_by=user.id
    )
    
    # Process Logic based on Type (Use movement.*)
    if movement.type == "IN":
        if not movement.to_branch_id:
            raise HTTPException(status_code=400, detail="to_branch_id required for IN")
        
        stock = await Stock.find_one(Stock.branch_id == movement.to_branch_id, Stock.product_id == movement.product_id)
        if not stock:
            # Create if not exists
            stock = Stock(branch_id=movement.to_branch_id, product_id=movement.product_id, quantity=0)
            await stock.insert()
        
        stock.quantity += movement.quantity
        await stock.save()

    elif movement.type == "OUT":
        if not movement.from_branch_id:
            raise HTTPException(status_code=400, detail="from_branch_id required for OUT")
        
        stock = await Stock.find_one(Stock.branch_id == movement.from_branch_id, Stock.product_id == movement.product_id)
        if not stock:
             raise HTTPException(status_code=404, detail="Stock not found")
        
        # Check negative stock
        if stock.quantity < movement.quantity:
            # Allow negative only if Admin
            if "admin" not in user.roles and "superadmin" not in user.roles:
                raise HTTPException(status_code=400, detail="Insufficient stock")
        
        stock.quantity -= movement.quantity
        await stock.save()

    elif movement.type == "TRANSFER":
        if not movement.from_branch_id or not movement.to_branch_id:
             raise HTTPException(status_code=400, detail="from_branch_id and to_branch_id required for TRANSFER")
        
        source = await Stock.find_one(Stock.branch_id == movement.from_branch_id, Stock.product_id == movement.product_id)
        dest = await Stock.find_one(Stock.branch_id == movement.to_branch_id, Stock.product_id == movement.product_id)
        
        if not source:
            raise HTTPException(status_code=404, detail="Source stock not found")
        
        if source.quantity < movement.quantity:
             if "admin" not in user.roles and "superadmin" not in user.roles:
                raise HTTPException(status_code=400, detail="Insufficient source stock")

        if not dest:
            dest = Stock(branch_id=movement.to_branch_id, product_id=movement.product_id, quantity=0)
            await dest.insert()
            
        source.quantity -= movement.quantity
        dest.quantity += movement.quantity
        
        await source.save()
        await dest.save()
    
    await movement.insert()

    # Log Activity
    from app.services.activity_service import log_activity
    desc = f"Movimiento {movement.type}: {movement.quantity} unidades"
    if movement.type == "TRANSFER":
        desc += " (Transferencia)"
    elif movement.type == "IN":
        desc += " (Entrada/Recepción)"
    elif movement.type == "OUT":
        desc += " (Salida/Ajuste)"
        
    await log_activity(
        user=user,
        action_type="INVENTORY_MOVE",
        description=desc,
        branch_id=movement.to_branch_id or movement.from_branch_id, # ambiguous for transfer, default to dest or source
        reference_id=str(movement.id)
    )

    return movement

@router.get("/movements")
async def get_movements(
    limit: int = 50,
    user: User = Depends(get_current_user)
):
    return await InventoryMovement.find_all().sort("-created_at").limit(limit).to_list()

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.product import Product
from app.models.stock import Stock
from app.models.branch import Branch
from app.routes.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[Product])
async def get_products(
    search: Optional[str] = None,
    kind: Optional[str] = None,
    branch_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    query = Product.find(Product.is_active == True)
    if kind:
        query = query.find(Product.kind == kind)
    if search:
        # Fetch all matches (contains)
        query = query.find({"name": {"$regex": search, "$options": "i"}})
    
    results = await query.to_list()
    
    # If branch_id provided, fetch stock
    if branch_id:
        try:
            from beanie import PydanticObjectId
            b_id = PydanticObjectId(branch_id)
            
            product_ids = [p.id for p in results]
            stocks = await Stock.find(
                Stock.branch_id == b_id,
                {"product_id": {"$in": product_ids}}
            ).to_list()
            
            stock_map = {s.product_id: s.quantity for s in stocks}
            
            for p in results:
                p.stock = stock_map.get(p.id, 0)
        except Exception:
            # If invalid ID, ignore stock
            pass
    
    if search:
        # Sort results: Starts with search term (case-insensitive) first
        search_lower = search.lower()
        results.sort(key=lambda p: (
            not p.name.lower().startswith(search_lower), # False (0) comes before True (1), so 'not' makes starts_with=True come first
            p.name # Then alphabetical
        ))
        
    return results

@router.post("/", response_model=Product)
async def create_product(product: Product, user: User = Depends(get_current_user)):
    if "admin" not in user.roles and "sales" not in user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await product.insert()
    
    # Initialize Stock for all active branches if it's a PRODUCT
    if product.kind == "PRODUCT":
        branches = await Branch.find(Branch.is_active == True).to_list()
        for branch in branches:
            # Check if exists (idempotency)
            exists = await Stock.find_one(Stock.branch_id == branch.id, Stock.product_id == product.id)
            if not exists:
                new_stock = Stock(branch_id=branch.id, product_id=product.id, quantity=0)
                await new_stock.insert()

    return product

@router.put("/{id}", response_model=Product)
async def update_product(id: str, data: dict, user: User = Depends(get_current_user)):
    if "admin" not in user.roles:
         raise HTTPException(status_code=403, detail="Not authorized")
    
    product = await Product.get(id)
    if not product:
         raise HTTPException(status_code=404, detail="Product not found")
    
    # If using dict for partial update
    await product.set(data)
    return product

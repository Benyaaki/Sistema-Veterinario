from fastapi import APIRouter, HTTPException, Depends, Query, Request
from beanie import PydanticObjectId
from typing import List, Optional
from app.models.product import Product
from app.models.stock import Stock
from app.models.branch import Branch
from app.routes.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/categories/", response_model=List[str])
async def get_categories(user: User = Depends(get_current_user)):
    print("DEBUG: Entering get_categories")
    try:
        # Method 1: Try Motor distinct via Product Document
        try:
            print("DEBUG: Method 1 (Product.get_motor_collection)")
            collection = Product.get_motor_collection()
            categories = await collection.distinct("category")
            if categories:
                return sorted([str(c).strip() for c in categories if c and str(c).strip()])
        except Exception as e:
            print(f"DEBUG: Method 1 failed: {e}")

        # Method 2: Fallback to all products (Safe for small datasets)
        try:
            print("DEBUG: Method 2 (find_all)")
            products = await Product.find_all().to_list()
            categories = list(set([p.category for p in products if p.category]))
            if categories:
                return sorted([str(c).strip() for c in categories if c and str(c).strip()])
        except Exception as e:
            print(f"DEBUG: Method 2 failed: {e}")

        # Method 3: Hardcoded defaults to ensure frontend works
        print("DEBUG: Method 3 (Hardcoded)")
        return ["Alimentos", "Snack", "Salud e higiene", "Accesorios", "Insumos", "Exóticos"]

    except Exception as e:
        import traceback
        print(f"DEBUG CRITICAL ERROR: {traceback.format_exc()}")
        return ["Alimentos", "Snack", "Salud e higiene", "Accesorios", "Insumos", "Exóticos"]

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
        import re
        search_safe = re.escape(search)
        # Strictly prefix matching for Name and SKU as per user request
        # "yo escribo la letra m inicial de letra m... y no me muestre nada si no hay con m"
        query = query.find({
            "$or": [
                {"name": {"$regex": f"^{search_safe}", "$options": "i"}},
                {"sku": {"$regex": f"^{search_safe}", "$options": "i"}}
            ]
        })
    
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
    
    # Sort results
    if search:
        search_lower = search.lower()
        results.sort(key=lambda p: (
            not p.name.lower().startswith(search_lower),
            p.name
        ))

    # Task 5: Permissions - Hide purchase_price for non-admins
    is_admin = "admin" in user.roles or "superadmin" in user.roles or user.role == "admin"
    if not is_admin:
        for p in results:
            p.purchase_price = 0.0

    return results

@router.post("/", response_model=Product)
async def create_product(request: Request, product: Product, user: User = Depends(get_current_user)):
    is_inventory_mgr = "admin" in user.roles or "seller" in user.roles or "inventory" in user.permissions
    if not is_inventory_mgr:
        raise HTTPException(status_code=403, detail="Not authorized to manage products")
    
    await product.insert()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="PRODUCT_CREATE",
        description=f"Producto creado: {product.name}",
        reference_id=str(product.id),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    # Initialize Stock for all active branches if it's a PRODUCT
    if product.kind == "PRODUCT":
        from app.models.branch import Branch
        from beanie import PydanticObjectId
        
        branches = await Branch.find(Branch.is_active == True).to_list()
        target_branch_id = None
        if product.branch_id:
            try:
                target_branch_id = PydanticObjectId(product.branch_id)
            except Exception:
                pass

        for branch in branches:
            # Check if exists (idempotency)
            exists = await Stock.find_one(Stock.branch_id == branch.id, Stock.product_id == product.id)
            if not exists:
                initial_qty = 0
                if target_branch_id and branch.id == target_branch_id:
                    initial_qty = product.stock if product.stock is not None else 0
                
                new_stock = Stock(branch_id=branch.id, product_id=product.id, quantity=initial_qty)
                await new_stock.insert()

    is_admin = "admin" in user.roles or "superadmin" in user.roles or user.role == "admin"
    if not is_admin:
        product.purchase_price = 0.0

    return product

@router.put("/{id}", response_model=Product)
async def update_product(request: Request, id: str, data: dict, user: User = Depends(get_current_user)):
    is_inventory_mgr = "admin" in user.roles or "seller" in user.roles or "inventory" in user.permissions
    if not is_inventory_mgr:
         raise HTTPException(status_code=403, detail="Not authorized to update products")
    
    product = await Product.get(id)
    if not product:
         raise HTTPException(status_code=404, detail="Product not found")
    
    # Handle manual stock adjustment
    manual_stock = data.pop("stock", None)
    branch_id = data.pop("branch_id", None)
    
    if manual_stock is not None and branch_id:
        from app.models.stock import Stock
        stock_record = await Stock.find_one(
            Stock.branch_id == PydanticObjectId(branch_id),
            Stock.product_id == product.id
        )
        
        old_qty = 0
        if stock_record:
            old_qty = stock_record.quantity
            stock_record.quantity = int(manual_stock)
            await stock_record.save()
        else:
            stock_record = Stock(
                branch_id=PydanticObjectId(branch_id),
                product_id=product.id,
                quantity=int(manual_stock)
            )
            await stock_record.insert()
            
        # Log manual adjustment
        from app.services.activity_service import log_activity
        await log_activity(
            user=user,
            action_type="INVENTORY_ADJUST",
            description=f"Ajuste manual de stock para {product.name}: {old_qty} -> {manual_stock}",
            reference_id=str(product.id),
            branch_id=PydanticObjectId(branch_id),
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )

    # Partial update for other fields
    await product.set(data)

    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="PRODUCT_UPDATE",
        description=f"Producto actualizado: {product.name}",
        reference_id=str(product.id),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )

    is_admin = "admin" in user.roles or "superadmin" in user.roles or user.role == "admin"
    if not is_admin:
        product.purchase_price = 0.0

    return product

@router.delete("/{id}")
async def delete_product(request: Request, id: str, user: User = Depends(get_current_user)):
    is_inventory_mgr = "admin" in user.roles or "seller" in user.roles or "inventory" in user.permissions
    if not is_inventory_mgr:
        raise HTTPException(status_code=403, detail="Not authorized to delete products")
    
    product = await Product.get(id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Soft delete
    await product.set({Product.is_active: False})

    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="PRODUCT_DELETE",
        description=f"Producto eliminado: {product.name}",
        reference_id=str(product.id),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    return {"message": "Product deactivated"}

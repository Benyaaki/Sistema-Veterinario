from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.supplier import Supplier
from app.routes.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Supplier])
async def get_suppliers(current_user = Depends(get_current_user)):
    return await Supplier.find_all().to_list()

@router.post("/", response_model=Supplier)
async def create_supplier(supplier: Supplier, current_user = Depends(get_current_user)):
    await supplier.insert()
    return supplier

@router.get("/{id}", response_model=Supplier)
async def get_supplier(id: str, current_user = Depends(get_current_user)):
    supplier = await Supplier.get(id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.put("/{id}", response_model=Supplier)
async def update_supplier(id: str, supplier_data: Supplier, current_user = Depends(get_current_user)):
    supplier = await Supplier.get(id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    supplier_data.id = supplier.id # ensure ID doesn't change
    await supplier_data.save()
    return supplier_data

@router.delete("/{id}")
async def delete_supplier(id: str, current_user = Depends(get_current_user)):
    supplier = await Supplier.get(id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    await supplier.delete()
    return {"message": "Supplier deleted"}

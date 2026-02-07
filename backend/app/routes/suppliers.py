from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional
from app.models.supplier import Supplier
from app.routes.auth import get_current_user
from pydantic import BaseModel, Field, EmailStr

router = APIRouter()

NAME_REGEX = r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$"
PHONE_REGEX = r"^\+56 9 \d{4} \d{4}$"

class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=PHONE_REGEX)
    address: Optional[str] = None
    website: Optional[str] = None
    rut: Optional[str] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = Field(None, pattern=NAME_REGEX)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=PHONE_REGEX)
    address: Optional[str] = None
    website: Optional[str] = None
    rut: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/", response_model=List[Supplier])
async def get_suppliers(current_user = Depends(get_current_user)):
    return await Supplier.find_all().to_list()

@router.post("/", response_model=Supplier)
async def create_supplier(request: Request, supplier_data: SupplierCreate, user = Depends(get_current_user)):
    supplier = Supplier(**supplier_data.model_dump())
    await supplier.insert()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="SUPPLIER_ADD",
        description=f"Proveedor registrado: {supplier.name}",
        reference_id=str(supplier.id),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    return supplier

@router.get("/{id}", response_model=Supplier)
async def get_supplier(id: str, user = Depends(get_current_user)):
    supplier = await Supplier.get(id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.put("/{id}", response_model=Supplier)
async def update_supplier(request: Request, id: str, supplier_data: SupplierUpdate, user = Depends(get_current_user)):
    supplier = await Supplier.get(id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    data = supplier_data.model_dump(exclude_unset=True)
    await supplier.set(data)

    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="SUPPLIER_EDIT",
        description=f"Editó información del proveedor: {supplier.name}",
        reference_id=id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        metadata={"fields_changed": list(data.keys())}
    )

    return supplier

@router.delete("/{id}")
async def delete_supplier(request: Request, id: str, user = Depends(get_current_user)):
    supplier = await Supplier.get(id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    name = supplier.name
    await supplier.delete()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="SUPPLIER_DELETE",
        description=f"Proveedor eliminado: {name}",
        reference_id=id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    return {"message": "Supplier deleted"}

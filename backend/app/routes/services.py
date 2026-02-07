from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.service import Service
from app.routes.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class ServiceCreate(BaseModel):
    name: str
    price: float
    category: str
    active: bool = True

class ServiceUpdate(BaseModel):
    name: str
    price: float
    category: str
    active: bool

@router.get("/", response_model=List[Service])
async def get_services(user = Depends(get_current_user)):
    return await Service.find_all().to_list()

@router.post("/", response_model=Service)
async def create_service(data: ServiceCreate, user = Depends(get_current_user)):
    service = Service(**data.model_dump())
    await service.insert()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="SERVICE_ADD",
        description=f"Servicio creado: {service.name} (${service.price})",
        reference_id=str(service.id)
    )
    
    return service

@router.put("/{id}", response_model=Service)
async def update_service(id: str, data: ServiceUpdate, user = Depends(get_current_user)):
    service = await Service.get(id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    await service.set(data.model_dump())
    return service

@router.delete("/{id}")
async def delete_service(id: str, user = Depends(get_current_user)):
    service = await Service.get(id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    name = service.name
    await service.delete()
    
    # Log Activity
    from app.services.activity_service import log_activity
    await log_activity(
        user=user,
        action_type="SERVICE_DELETE",
        description=f"Servicio eliminado: {name}",
        reference_id=id
    )
    
    return {"message": "Deleted"}

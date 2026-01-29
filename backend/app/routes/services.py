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
    
    await service.delete()
    return {"message": "Deleted"}

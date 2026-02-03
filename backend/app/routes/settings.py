from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from app.models.settings import VetSettings
from app.models.user import User
from app.routes.auth import get_current_user
from app.services.file_service import save_upload_file
from pydantic import BaseModel

router = APIRouter()

from typing import Dict

class SettingsUpdate(BaseModel):
    clinic_name: str
    rut: Optional[str] = None
    address: str
    phone: str
    fax: Optional[str] = None
    email: str
    website: Optional[str] = None
    city: str
    policy_text: Optional[str] = None
    logo_url: Optional[str] = None
    email_templates: Dict[str, str] = {}
    schedule: Dict[str, str] = {}

@router.get("/")
async def get_settings(user = Depends(get_current_user)):
    settings = await VetSettings.find_one()
    if not settings:
        settings = VetSettings()
        await settings.insert()
    return settings

@router.put("/")
async def update_settings(data: SettingsUpdate, user = Depends(get_current_user)):
    settings = await VetSettings.find_one()
    if not settings:
        settings = VetSettings()
    
    await settings.set(data.model_dump())
    return settings

@router.post("/signature")
async def upload_signature(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    record = await save_upload_file(file, "user_signature", str(user.id))
    user.signature_file_id = str(record.id)
    await user.save()
    return {"message": "Signature updated", "file_id": str(record.id)}

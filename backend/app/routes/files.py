from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.models.file_record import FileRecord
from app.routes.auth import get_current_user
from app.core.config import settings
import os

router = APIRouter()

@router.get("/{id}")
async def get_file(id: str):
    file_record = await FileRecord.get(id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = os.path.join(settings.UPLOAD_DIR, file_record.path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(file_path, filename=file_record.original_name, media_type=file_record.mime_type)

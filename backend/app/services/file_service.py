import shutil
import os
import uuid
from fastapi import UploadFile, HTTPException
from app.core.config import settings
from app.models.file_record import FileRecord

ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB

async def save_upload_file(file: UploadFile, owner_type: str, owner_id: str, comment: str = None) -> FileRecord:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Check size? FastAPI doesn't easily give size before read, but we can check after read or stream.
    # For simplicity, we trust stream or check length if Content-Length header exists.
    
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    # Ensure upload dir exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Get size
    size = os.path.getsize(file_path)
    if size > MAX_FILE_SIZE:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="File too large")
        
    file_record = FileRecord(
        owner_type=owner_type,
        owner_id=owner_id,
        path=filename, # Store relative filename
        original_name=file.filename,
        mime_type=file.content_type,
        size=size,
        comment=comment
    )
    await file_record.insert()
    return file_record

from beanie import Document
from datetime import datetime
from typing import Optional

class FileRecord(Document):
    owner_type: str # 'exam', 'consultation', 'prescription', 'user'
    owner_id: str
    path: str
    original_name: str
    mime_type: str
    mime_type: str
    size: int
    comment: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "files"

from beanie import Document
from datetime import datetime
from typing import Optional

class User(Document):
    name: str = "Admin"
    email: str
    password_hash: str
    role: str = "admin"
    signature_file_id: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "users"

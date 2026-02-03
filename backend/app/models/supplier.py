from beanie import Document
from datetime import datetime
from typing import Optional

class Supplier(Document):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    rut: Optional[str] = None
    is_active: bool = True
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "suppliers"

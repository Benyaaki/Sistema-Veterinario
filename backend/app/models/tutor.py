from beanie import Document
from datetime import datetime
from typing import Optional

class Tutor(Document):
    full_name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    discount_percent: float = 0.0
    debt: float = 0.0
    total_spent: float = 0.0
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "tutors"

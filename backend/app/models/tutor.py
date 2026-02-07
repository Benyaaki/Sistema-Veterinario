from beanie import Document
from datetime import datetime
from typing import Optional

class Tutor(Document):
    first_name: str
    last_name: str
    phone: str
    email: Optional[str] = None
    notes: Optional[str] = None
    discount_percent: float = 0.0
    debt: float = 0.0
    total_spent: float = 0.0
    is_tutor: bool = True
    is_client: bool = True
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "tutors"

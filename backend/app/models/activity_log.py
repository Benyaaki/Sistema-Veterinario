from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel

class ActivityLog(Document):
    user_id: Optional[PydanticObjectId] = None
    user_name: Optional[str] = "Unknown"
    action_type: str  # SALE, INVENTORY_MOVE, APPOINTMENT, PRODUCT_ADD, CLIENT_ADD, SUPPLIER_ADD, etc.
    description: str
    branch_id: Optional[PydanticObjectId] = None
    branch_name: Optional[str] = None
    reference_id: Optional[str] = None  # ID del objeto relacionado
    metadata: Optional[Dict] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "activity_logs"

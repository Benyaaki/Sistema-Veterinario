from beanie import Document, PydanticObjectId
from datetime import datetime, timezone
from typing import Optional, Dict
from pydantic import BaseModel, Field

class ActivityLog(Document):
    user_id: Optional[PydanticObjectId] = None
    user_name: Optional[str] = None
    action_type: str  # SALE, INVENTORY_MOVE, APPOINTMENT, PRODUCT_ADD, CLIENT_ADD, SUPPLIER_ADD, etc.
    description: str
    branch_id: Optional[PydanticObjectId] = None
    branch_name: Optional[str] = None
    reference_id: Optional[str] = None  # ID del objeto relacionado
    metadata: Optional[Dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "activity_logs"

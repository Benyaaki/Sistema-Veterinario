from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional, Dict

class DeliveryOrder(Document):
    sale_id: PydanticObjectId
    branch_id: PydanticObjectId
    assigned_user_id: Optional[PydanticObjectId] = None
    status: str = "PENDING" # PENDING, ASSIGNED, IN_TRANSIT, DELIVERED, FAILED
    
    customer_snapshot: Dict = {} # Name, Address, Phone captured at sale
    shipping_cost: float = 0.0
    scheduled_at: Optional[datetime] = None  # To schedule delivery
    sale_details: Optional[Dict] = None # Populated on fetch
    
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Settings:
        name = "delivery_orders"

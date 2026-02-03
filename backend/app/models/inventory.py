from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import Optional

class InventoryMovement(Document):
    type: str # IN, OUT, TRANSFER, SALE, VOID_SALE
    product_id: PydanticObjectId
    quantity: int
    from_branch_id: Optional[PydanticObjectId] = None
    to_branch_id: Optional[PydanticObjectId] = None
    reason: str
    reference_sale_id: Optional[PydanticObjectId] = None
    created_by: PydanticObjectId
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "inventory_movements"

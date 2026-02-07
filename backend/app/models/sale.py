from beanie import Document, PydanticObjectId
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field

class SaleItem(BaseModel):
    product_id: Optional[PydanticObjectId] = None
    name: str
    type: str # PRODUCT, SERVICE, SHIPPING
    quantity: int
    unit_price: float
    total: float
    category: Optional[str] = None # For Task 1 (Reports by Category)
    professional_id: Optional[PydanticObjectId] = None # For Task 2 (Commissions)
    professional_name: Optional[str] = None

class Sale(Document):
    branch_id: PydanticObjectId
    customer_id: Optional[PydanticObjectId] = None # Tutor
    customer_name: Optional[str] = None # Populated manually
    items: List[SaleItem] = []
    subtotal: float = 0.0
    discount_percent: float = 0.0 # From Tutor
    discount_amount: float = 0.0
    total: float = 0.0
    payment_method: str # CASH, TRANSFER, DEBIT, CREDIT, DUE
    cash_received: Optional[float] = None
    cash_change: Optional[float] = None
    cash_session_id: Optional[PydanticObjectId] = None # For Task 6 & 7 (Caja)
    
    
    channel: str = "STORE" # STORE, DELIVERY
    status: str = "COMPLETED" # COMPLETED, VOIDED, PENDING_DELIVERY
    voided_by: Optional[PydanticObjectId] = None
    void_reason: Optional[str] = None
    voided_at: Optional[datetime] = None

    created_by: PydanticObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "sales"

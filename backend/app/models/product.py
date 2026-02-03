from beanie import Document
from datetime import datetime
from typing import Optional

class Product(Document):
    name: str
    sku: Optional[str] = None
    kind: str = "PRODUCT" # PRODUCT, SERVICE
    category: Optional[str] = None
    supplier_name: Optional[str] = None
    purchase_price: float = 0.0
    sale_price: float = 0.0
    stock: Optional[int] = None # Virtual field for frontend display (per branch)
    is_active: bool = True
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "products"

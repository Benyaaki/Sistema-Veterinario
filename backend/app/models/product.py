from beanie import Document
from datetime import datetime
from typing import Optional

class Product(Document):
    external_id: Optional[int] = None # ID from old system
    name: str
    sku: Optional[str] = None # UPC/EAN/ISBN
    kind: str = "PRODUCT" # PRODUCT, SERVICE
    category: Optional[str] = None
    supplier_name: Optional[str] = None
    purchase_price: float = 0.0
    sale_price: float = 0.0
    tax_percent: float = 0.0
    avatar: Optional[str] = None
    stock: Optional[int] = None # Virtual field for frontend display (per branch)
    branch_id: Optional[str] = None # Temporary field for creation/initial stock
    branch_prices: dict = {} # Map branch_id (str) -> price (float)
    stock_alert_threshold: int = 5
    is_active: bool = True
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "products"

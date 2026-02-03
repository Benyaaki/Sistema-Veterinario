from beanie import Document, PydanticObjectId
from datetime import datetime
from pymongo import IndexModel, ASCENDING

class Stock(Document):
    branch_id: PydanticObjectId
    product_id: PydanticObjectId
    quantity: int = 0
    updated_at: datetime = datetime.utcnow()

    class Settings:
        name = "stocks"
        indexes = [
            IndexModel([("branch_id", ASCENDING), ("product_id", ASCENDING)], unique=True)
        ]

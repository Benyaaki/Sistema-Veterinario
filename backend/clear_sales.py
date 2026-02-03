import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

async def clear_sales():
    print("Conectando a MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]
    
    # Count before
    count_before = await db.sales.count_documents({})
    print(f"Ventas antes de eliminar: {count_before}")
    
    # Delete all
    result = await db.sales.delete_many({})
    print(f"✓ Eliminadas {result.deleted_count} ventas")
    
    # Verify
    count_after = await db.sales.count_documents({})
    print(f"Ventas después de eliminar: {count_after}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_sales())

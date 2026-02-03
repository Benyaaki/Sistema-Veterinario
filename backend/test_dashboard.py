import asyncio
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.sale import Sale
from app.models.consultation import Consultation
from app.models.branch import Branch
from app.models.user import User

async def test_dashboard():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.DB_NAME], 
        document_models=[Sale, Consultation, Branch, User]
    )
    
    # Test dates
    start_date = "2026-02-01T00:00:00.000Z"
    end_date = "2026-02-01T23:59:59.000Z"
    
    print(f"Start: {start_date}")
    print(f"End: {end_date}")
    
    # Parse dates
    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    print(f"Parsed start: {start_dt}")
    print(f"Parsed end: {end_dt}")
    
    # Fetch sales
    sales = await Sale.find(
        Sale.created_at >= start_dt,
        Sale.created_at < end_dt,
        Sale.status == "COMPLETED"
    ).to_list()
    
    print(f"\nFound {len(sales)} sales:")
    for sale in sales:
        print(f"  - {sale.created_at}: ${sale.total}")
    
    # Fetch consultations
    consultations = await Consultation.find(
        Consultation.date >= start_dt,
        Consultation.status == "scheduled"
    ).to_list()
    
    print(f"\nFound {len(consultations)} consultations:")
    for cons in consultations:
        print(f"  - {cons.date}: {cons.status}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_dashboard())

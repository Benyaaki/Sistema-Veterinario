"""
Simple script to check dashboard data
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.branch import Branch
from app.models.sale import Sale
from app.models.consultation import Consultation
from datetime import datetime

async def main():
    print("Connecting to database...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.DB_NAME],
        document_models=[User, Branch, Sale, Consultation]
    )
    
    # Check Branches
    print("\nBranches:")
    branches = await Branch.find_all().to_list()
    for b in branches:
        print(f"  - {b.name} (ID: {b.id})")
    
    # Check Sales
    print("\nSales (today):")
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    sales = await Sale.find(
        Sale.created_at >= today_start
    ).to_list()
    total = sum(s.total for s in sales)
    print(f"  Count: {len(sales)}")
    print(f"  Total: ${total}")
    
    # Check Consultations
    print("\nConsultations (pending):")
    consultations = await Consultation.find(
        Consultation.date >= today_start,
        Consultation.status == "scheduled"
    ).to_list()
    print(f"  Count: {len(consultations)}")
    
    print("\nDone!")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())

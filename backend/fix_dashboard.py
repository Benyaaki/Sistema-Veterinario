"""
Script to diagnose and fix dashboard issues
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
    print("="*60)
    print("DASHBOARD DIAGNOSTIC TOOL")
    print("="*60)
    
    # Connect to DB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.DB_NAME],
        document_models=[User, Branch, Sale, Consultation]
    )
    
    # 1. Check Branches
    print("\n1. CHECKING BRANCHES...")
    branches = await Branch.find_all().to_list()
    print(f"   Found {len(branches)} branches:")
    for b in branches:
        print(f"   - {b.name} (ID: {b.id})")
    
    if len(branches) == 0:
        print("   ❌ NO BRANCHES FOUND! Creating default branch...")
        branch = Branch(name="Sucursal Olivar", address="Default", phone="000000")
        await branch.insert()
        print(f"   ✅ Created branch: {branch.name} (ID: {branch.id})")
        branches = [branch]
    
    # 2. Check Users
    print("\n2. CHECKING USERS...")
    users = await User.find_all().to_list()
    print(f"   Found {len(users)} users:")
    for u in users:
        branch_id = getattr(u, 'branch_id', None)
        print(f"   - {u.email} | Roles: {u.roles} | Branch: {branch_id}")
        
        # Fix users without branch_id
        if not branch_id and len(branches) > 0:
            print(f"     ⚠️  User {u.email} has no branch_id, assigning to {branches[0].name}...")
            u.branch_id = branches[0].id
            await u.save()
            print(f"     ✅ Assigned branch_id: {branches[0].id}")
    
    # 3. Check Sales
    print("\n3. CHECKING SALES (Today)...")
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    sales = await Sale.find(
        Sale.created_at >= today_start,
        Sale.status == "COMPLETED"
    ).to_list()
    print(f"   Found {len(sales)} sales today:")
    total = sum(s.total for s in sales)
    for s in sales:
        print(f"   - ${s.total} at {s.created_at} | Branch: {s.branch_id}")
    print(f"   TOTAL: ${total}")
    
    # 4. Check Consultations
    print("\n4. CHECKING CONSULTATIONS (Pending)...")
    consultations = await Consultation.find(
        Consultation.date >= today_start,
        Consultation.status == "scheduled"
    ).to_list()
    print(f"   Found {len(consultations)} pending consultations:")
    for c in consultations:
        print(f"   - {c.date} | Branch: {c.branch_id}")
    
    # 5. Test Dashboard Logic
    print("\n5. TESTING DASHBOARD LOGIC...")
    print(f"   Expected Dashboard Stats:")
    print(f"   - Sales Today: ${total}")
    print(f"   - Transactions: {len(sales)}")
    print(f"   - Pending Appointments: {len(consultations)}")
    
    print("\n" + "="*60)
    print("DIAGNOSTIC COMPLETE")
    print("="*60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())

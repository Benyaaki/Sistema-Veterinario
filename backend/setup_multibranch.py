"""
Script to clean data and prepare multi-branch system
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, PydanticObjectId
from app.core.config import settings
from app.models.user import User
from app.models.branch import Branch
from app.models.sale import Sale
from app.models.consultation import Consultation

async def main():
    print("="*60)
    print("MULTI-BRANCH SYSTEM SETUP")
    print("="*60)
    
    # Connect to DB
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.DB_NAME],
        document_models=[User, Branch, Sale, Consultation]
    )
    
    # 1. Clear Sales
    print("\n1. CLEARING SALES HISTORY...")
    result = await Sale.find_all().delete()
    print(f"   ✅ Deleted {result.deleted_count if result else 0} sales")
    
    # 2. Clear Consultations
    print("\n2. CLEARING SCHEDULED APPOINTMENTS...")
    result = await Consultation.find_all().delete()
    print(f"   ✅ Deleted {result.deleted_count if result else 0} consultations")
    
    # 3. Get branches
    print("\n3. CHECKING BRANCHES...")
    branches = await Branch.find_all().to_list()
    print(f"   Found {len(branches)} branches:")
    for b in branches:
        print(f"   - {b.name} (ID: {b.id})")
    
    if len(branches) == 0:
        print("   ⚠️  No branches found! Please create branches first.")
        client.close()
        return
    
    # 4. Assign branches to users
    print("\n4. ASSIGNING BRANCHES TO USERS...")
    users = await User.find_all().to_list()
    default_branch = branches[0]
    
    for user in users:
        if not user.branch_id:
            print(f"   Assigning {user.email} to {default_branch.name}...")
            user.branch_id = default_branch.id  # PydanticObjectId, not str
            await user.save()
            print(f"   ✅ Done")
        else:
            print(f"   {user.email} already has branch: {user.branch_id}")
    
    print("\n" + "="*60)
    print("SETUP COMPLETE!")
    print("="*60)
    print("\nNext steps:")
    print("1. Restart the backend server")
    print("2. Logout and login again in the frontend")
    print("3. Create new sales and appointments")
    print("4. Dashboard should now show correct data per branch")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())

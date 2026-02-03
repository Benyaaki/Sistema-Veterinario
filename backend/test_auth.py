"""
Test if backend endpoints are accessible
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.core.security import create_access_token

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.DB_NAME], document_models=[User])
    
    # Find a user
    user = await User.find_one()
    if not user:
        print("No users found!")
        client.close()
        return
    
    # Generate a fresh token
    token = create_access_token({"sub": user.email})
    
    print("="*60)
    print("AUTHENTICATION TEST")
    print("="*60)
    print(f"\nUser: {user.email}")
    print(f"Token: {token[:50]}...")
    print(f"\nTest the following commands:\n")
    
    print("1. Test /branches endpoint:")
    print(f'   curl -H "Authorization: Bearer {token}" http://localhost:8000/api/v1/branches/')
    
    print("\n2. Test /auth/me endpoint:")
    print(f'   curl -H "Authorization: Bearer {token}" http://localhost:8000/api/v1/auth/me')
    
    print("\n3. Test /reports/dashboard endpoint:")
    print(f'   curl -H "Authorization: Bearer {token}" "http://localhost:8000/api/v1/reports/dashboard?start_date=2026-02-01T00:00:00.000Z&end_date=2026-02-01T23:59:59.000Z"')
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())

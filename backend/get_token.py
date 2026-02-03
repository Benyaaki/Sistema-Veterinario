import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.core.security import create_access_token

async def get_token():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.DB_NAME], document_models=[User])
    
    # Find any user
    user = await User.find_one()
    if not user:
        print("No users found!")
        return
    
    print(f"User: {user.email}, Roles: {user.roles}")
    
    # Generate token
    token = create_access_token({"sub": str(user.id)})
    print(f"\nToken: {token}")
    print(f"\nTest command:")
    print(f'curl "http://localhost:8000/api/v1/reports/dashboard?start_date=2026-02-01T00:00:00.000Z&end_date=2026-02-01T23:59:59.000Z" -H "Authorization: Bearer {token}"')
    
    client.close()

if __name__ == "__main__":
    asyncio.run(get_token())

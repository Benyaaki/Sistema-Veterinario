import asyncio
import sys
import os
import urllib.request
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.core.security import create_access_token
from app.models.branch import Branch

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.DB_NAME], document_models=[User, Branch])
    
    # Find a seller
    users = await User.find_all().to_list()
    target_user = None
    for u in users:
        if "admin" not in u.roles and "superadmin" not in u.roles:
            target_user = u
            break
            
    if not target_user:
        target_user = users[0]

    print(f"Testing as User: {target_user.name} ({target_user.email})")

    token = create_access_token({"sub": str(target_user.id)})
    
    # Prepare URL
    now = datetime.now()
    start = now.replace(hour=0, minute=0, second=0).isoformat() + 'Z'
    end = now.replace(hour=23, minute=59, second=59).isoformat() + 'Z'
    url = f"http://localhost:8000/api/v1/reports/dashboard?start_date={start}&end_date={end}"
    
    print(f"Requesting: {url}")
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status: {response.status}")
            print(f"Response: {response.read().decode()}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} {e.reason}")
        print(e.read().decode())
    except Exception as e:
        print(f"Error: {e}")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())

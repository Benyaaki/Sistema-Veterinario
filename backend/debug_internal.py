import asyncio
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.user import User
from app.models.branch import Branch
from app.models.sale import Sale
from app.models.consultation import Consultation
from app.routes.reports import dashboard_stats

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.DB_NAME], document_models=[User, Branch, Sale, Consultation])
    
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
    
    # Define Time Window (Today UTC based on typical frontend behavior)
    # Frontend sends ISO timestamp of user's local start of day.
    # We will simulate what the frontend likely sends.
    # If user is -3h. Start of day is 00:00 -3 = 03:00 UTC.
    now_utc = datetime.utcnow()
    # Let's say we want 'Today' relative to logic.
    # The function defaults to UTC 00:00 if no params.
    # Let's test with the EXACT strings the frontend sends?
    # We can't know exactly without logs.
    
    # Let's test with explicit "Today" coverage.
    # Sale was at 04:24 UTC (01:24 AM Local).
    # Range 00:00 UTC to 23:59 UTC SHOULD catch it.
    
    print("\n--- TEST 1: No Params (Defaults to UTC Today) ---")
    try:
        result = await dashboard_stats(start_date=None, end_date=None, user=target_user)
        print("Result:", result['global'])
    except Exception as e:
        print("Error:", e)

    print("\n--- TEST 2: Wide Range (Last 48 hours) ---")
    # Simulate a wide range to see if it catches ANYTHING
    from datetime import timedelta
    start = (now_utc - timedelta(hours=48)).isoformat() + 'Z'
    end = (now_utc + timedelta(hours=48)).isoformat() + 'Z'
    
    try:
        result = await dashboard_stats(start_date=start, end_date=end, user=target_user)
        print("Result:", result['global'])
    except Exception as e:
        print("Error:", e)
        
    client.close()

if __name__ == "__main__":
    asyncio.run(main())

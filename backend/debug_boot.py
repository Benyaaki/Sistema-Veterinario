import asyncio
from app.core.database import init_db
from app.models.branch import Branch
from app.models.user import User

async def test_boot():
    try:
        print("Initializing DB...")
        await init_db()
        print("DB Initialized.")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_boot())

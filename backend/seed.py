import asyncio
import sys
import os

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.core.database import init_db
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings

async def seed_admin():
    print("Seeding database...")
    await init_db()
    admin = await User.find_one(User.email == settings.ADMIN_EMAIL)
    if not admin:
        hashed = get_password_hash(settings.ADMIN_PASSWORD)
        user = User(
            name="Administrador",
            email=settings.ADMIN_EMAIL,
            password_hash=hashed,
            role="admin"
        )
        await user.insert()
        print(f"Admin user created: {settings.ADMIN_EMAIL}")
    else:
        print("Admin user already exists")

if __name__ == "__main__":
    asyncio.run(seed_admin())

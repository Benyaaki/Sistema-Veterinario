from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.user import User
from app.models.tutor import Tutor
from app.models.patient import Patient
from app.models.consultation import Consultation
from app.models.exam import Exam
from app.models.prescription import Prescription
from app.models.settings import VetSettings
from app.models.file_record import FileRecord
from app.models.service import Service

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.DB_NAME],
        document_models=[
            User,
            Tutor,
            Patient,
            Consultation,
            Exam,
            Prescription,
            VetSettings,
            FileRecord,
            Service
        ]
    )
    await create_initial_user()

async def create_initial_user():
    from app.core.security import get_password_hash # Import here to avoid circular depends if any
    
    admin = await User.find_one(User.email == settings.ADMIN_EMAIL)
    hashed = get_password_hash(settings.ADMIN_PASSWORD)
    
    if not admin:
        user = User(
            name="Administrador",
            email=settings.ADMIN_EMAIL,
            password_hash=hashed,
            role="admin"
        )
        await user.insert()
        print(f"--- Admin user created: {settings.ADMIN_EMAIL} ---")
    else:
        # Force update password to match current environment variable
        admin.password_hash = hashed
        await admin.save()
        print(f"--- Admin password updated for: {settings.ADMIN_EMAIL} ---")

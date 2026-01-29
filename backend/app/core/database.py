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

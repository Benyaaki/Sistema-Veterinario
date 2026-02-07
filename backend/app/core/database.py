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
            Service,
            # v2.0 Models
            "app.models.branch.Branch",
            "app.models.product.Product",
            "app.models.stock.Stock",
            "app.models.inventory.InventoryMovement",
            "app.models.sale.Sale",
            "app.models.delivery.DeliveryOrder",
            "app.models.supplier.Supplier",
            "app.models.activity_log.ActivityLog",
            "app.models.session.UserSession",
            "app.models.cash_session.CashSession",
        ]
    )

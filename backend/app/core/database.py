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
        ]
    )
    # await create_initial_user() # Disabled per user request (admin@paty.vet regeneration)

async def create_initial_user():
    from app.core.security import get_password_hash # Import here to avoid circular depends if any
    
    # Ensure no whitespace issues from Env Vars
    admin_email = settings.ADMIN_EMAIL.strip()
    admin_password = settings.ADMIN_PASSWORD.strip()
    
    admin = await User.find_one(User.email == admin_email)
    hashed = get_password_hash(admin_password)
    
    if not admin:
        user = User(
            name="Administrador",
            email=admin_email,
            password_hash=hashed,
            role="admin"
        )
        await user.insert()
        print(f"--- Admin user created: {admin_email} ---")
    else:
        # Force update password to match current environment variable
        admin.password_hash = hashed
        admin.email = admin_email # Ensure email matches sanitized version
        await admin.save()
        print(f"--- Admin password updated for: {admin_email} ---")

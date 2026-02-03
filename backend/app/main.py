from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("--- STARTING DB INIT ---")
    try:
        await init_db()
        print("--- DB INIT SUCCESS ---")
    except Exception as e:
        print(f"--- DB INIT ERROR: {e} ---")
    yield

app = FastAPI(
    title="Paty Veterinaria API",
    lifespan=lifespan,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Paty Veterinaria API"}

from app.routes import auth, tutors, patients, consultations, exams, prescriptions, files, settings
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(tutors.router, prefix="/api/v1/tutors", tags=["Tutors"])
app.include_router(patients.router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(consultations.router, prefix="/api/v1/consultations", tags=["Consultations"])
app.include_router(exams.router, prefix="/api/v1/exams", tags=["Exams"])
app.include_router(prescriptions.router, prefix="/api/v1/prescriptions", tags=["Prescriptions"])
app.include_router(files.router, prefix="/api/v1/files", tags=["Files"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["Settings"])

from app.routes import services
app.include_router(services.router, prefix="/api/v1/services", tags=["Services"])

from app.routes import dashboard
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])

from app.routes import debug
app.include_router(debug.router, prefix="/api/v1/debug", tags=["Debug"])

# v2.0 Routes
# v2.0 Routes
from app.routes import branches, products, inventory, sales, deliveries, reports, suppliers, activity_logs
app.include_router(branches.router, prefix="/api/v1/branches", tags=["Branches"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(sales.router, prefix="/api/v1/sales", tags=["Sales"])
app.include_router(deliveries.router, prefix="/api/v1/deliveries", tags=["Deliveries"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
app.include_router(activity_logs.router, prefix="/api/v1/activity-logs", tags=["Activity Logs"])

from app.routes import users
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])

from app.routes import import_data
app.include_router(import_data.router, prefix="/api/v1/import", tags=["Import"])



# Force Reload Trigger

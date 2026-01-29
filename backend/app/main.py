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

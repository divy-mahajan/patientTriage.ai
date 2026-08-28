"""
PatientTriage.ai — Main FastAPI Application Entrypoint
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import model._bootstrap  # noqa: F401
from backend.app.core.config import settings
from backend.app.db.database import engine, Base, SessionLocal, init_db
from backend.app.services.patient_service import patient_service
from backend.app.services.doctor_service import doctor_service
from backend.app.services.hospital_service import hospital_service
from backend.app.services.auth_service import auth_service
from backend.app.api.auth import router as auth_router
from backend.app.api.patients import router as patients_router
from backend.app.api.triage import router as triage_router
from backend.app.api.hospital import router as hospital_router
from backend.app.api.beds import router as beds_router
from backend.app.api.doctors import router as doctors_router
from backend.app.api.tests import router as tests_router
from backend.app.api.reassessment import router as reassessment_router
from backend.app.api.treatments import router as treatments_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables, migrate schema columns, and seed initial data
    init_db()
    db = SessionLocal()
    try:
        doctor_service.seed_initial_roster_if_empty(db)
        auth_service.seed_initial_clinicians_if_empty(db)
        patient_service.seed_initial_patients_if_empty(db)
        from backend.app.services.treatment_service import treatment_service
        treatment_service.seed_initial_treatments_if_empty(db)
    finally:
        db.close()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="PatientTriage.ai Backend API",
    description="Clinician-facing hospital triage, ML risk prediction, swappable capacity, and bed assignment API.",
    version=settings.app_version,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(triage_router)
app.include_router(hospital_router)
app.include_router(beds_router)
app.include_router(doctors_router)
app.include_router(tests_router)
app.include_router(reassessment_router)
app.include_router(treatments_router)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint providing runtime system state."""
    capacity = hospital_service.get_capacity_state()
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "active_hospital_profile": capacity.get("hospital_id", "unknown"),
        "total_beds": capacity.get("summary", {}).get("total_beds", 0),
        "available_beds": capacity.get("summary", {}).get("available_beds", 0)
    }

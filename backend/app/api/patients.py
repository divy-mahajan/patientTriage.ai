"""
PatientTriage.ai — Patient API Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.schemas.patient import PatientCreate, PatientResponse, PatientListResponse
from backend.app.services.patient_service import patient_service

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(patient_in: PatientCreate, db: Session = Depends(get_db)):
    """
    Intake a new patient into the hospital triage system.
    Stores all demographic, arrival, complaint, symptoms, observations, and vital signs in SQLite.
    """
    try:
        new_patient = patient_service.create_patient(db, patient_in)
        return new_patient
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=PatientListResponse)
def list_patients(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by workflow status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Retrieve stored patients with optional status filtering.
    """
    patients = patient_service.list_patients(db, status=status_filter, skip=skip, limit=limit)
    total = patient_service.count_patients(db, status=status_filter)
    return PatientListResponse(total=total, patients=patients)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a specific patient record by ID.
    """
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient '{patient_id}' not found")
    return patient

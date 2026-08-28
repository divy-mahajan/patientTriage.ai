"""
PatientTriage.ai — Patient Treatments & Prescriptions API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.db.database import get_db
from backend.app.schemas.treatment import TreatmentCreate, TreatmentUpdate, TreatmentResponse, TreatmentListResponse
from backend.app.services.treatment_service import treatment_service

router = APIRouter(prefix="/api/treatments", tags=["Treatments"])


@router.get("/patient/{patient_id}", response_model=TreatmentListResponse)
def get_patient_treatments(patient_id: str, db: Session = Depends(get_db)):
    """List all active and recorded treatments for a specific patient."""
    treatments = treatment_service.list_patient_treatments(db, patient_id)
    return TreatmentListResponse(
        patient_id=patient_id,
        treatments=treatments,
        total=len(treatments)
    )


@router.post("/patient/{patient_id}", response_model=TreatmentResponse, status_code=status.HTTP_201_CREATED)
def add_patient_treatment(patient_id: str, req: TreatmentCreate, db: Session = Depends(get_db)):
    """Order or administer a new clinical treatment / infusion for a patient."""
    req.patient_id = patient_id
    try:
        return treatment_service.add_treatment(db, req)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

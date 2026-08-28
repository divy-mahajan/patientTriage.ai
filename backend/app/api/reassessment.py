"""
PatientTriage.ai — Reassessment, Monitoring & Audit Log API Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import Patient
from backend.app.schemas.reassessment import (
    RecordVitalsRequest,
    ClinicianOverrideRequest,
    MonitoringStatusResponse,
    ReassessmentItem,
    ReassessmentHistoryResponse,
    AlertsListResponse,
    AuditListResponse
)
from backend.app.services.reassessment_service import reassessment_service

router = APIRouter(tags=["Patient Reassessment & Monitoring"])


@router.get("/api/reassessment/status/{patient_id}", response_model=MonitoringStatusResponse)
def get_patient_monitoring_status(patient_id: str, db: Session = Depends(get_db)):
    """
    Get live continuous monitoring status, time since last vitals, time until next due,
    and active deterioration state for a patient.
    """
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient '{patient_id}' not found")
    return reassessment_service.get_patient_monitoring_status(db, patient)


@router.post("/api/reassessment/vitals/{patient_id}", response_model=ReassessmentItem, status_code=status.HTTP_201_CREATED)
def record_new_vitals(patient_id: str, vitals_in: RecordVitalsRequest, db: Session = Depends(get_db)):
    """
    Record updated vital signs observation, detect clinically explainable deterioration,
    re-run ML assessment preserving feature schema, and persist reassessment record.
    """
    try:
        return reassessment_service.record_new_vitals_and_reassess(db, patient_id, vitals_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/reassessment/override/{patient_id}", response_model=ReassessmentItem)
def record_clinician_override(patient_id: str, override_in: ClinicianOverrideRequest, db: Session = Depends(get_db)):
    """
    Record a clinician override for a patient's triage level with authoritative clinical rationale.
    """
    try:
        return reassessment_service.record_clinician_override(db, patient_id, override_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/api/reassessment/history/{patient_id}", response_model=ReassessmentHistoryResponse)
def get_patient_reassessment_history(patient_id: str, db: Session = Depends(get_db)):
    """
    Retrieve complete chronological reassessment timeline and vital sign progression for a patient.
    """
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient '{patient_id}' not found")
    return reassessment_service.get_patient_history(db, patient_id)


@router.get("/api/reassessment/alerts", response_model=AlertsListResponse)
def list_active_reassessment_alerts(db: Session = Depends(get_db)):
    """
    List all active deterioration alerts and waiting-time reassessment triggers across active queue.
    """
    try:
        return reassessment_service.get_active_reassessment_alerts(db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/api/audit", response_model=AuditListResponse)
def list_audit_logs(
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Retrieve immutable audit trail records for clinical events, vitals changes, deteriorations, and overrides.
    """
    try:
        return reassessment_service.list_audit_logs(db, patient_id=patient_id, event_type=event_type, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

"""
PatientTriage.ai — Triage API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.schemas.triage import TriageScoreRequest, TriageScoreResponse
from backend.app.services.triage_service import triage_service

router = APIRouter(prefix="/api/triage", tags=["Triage"])


@router.post("/score", response_model=TriageScoreResponse)
def score_patient_triage(request: TriageScoreRequest, db: Session = Depends(get_db)):
    """
    Run ML triage prediction on a patient (by patient_id or direct payload).
    Returns predicted ESI triage level, continuous risk score, high-risk flag,
    confidence score, and interpretable feature contributions.
    """
    try:
        response = triage_service.score_patient(db, request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

"""
PatientTriage.ai — Bed Recommendation, Assignment, Release & Cleaning Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.schemas.bed import (
    BedRecommendRequest,
    BedRecommendResponse,
    BedAssignRequest,
    BedAssignResponse,
    BedReleaseRequest,
    BedReleaseResponse,
    BedCompleteCleaningRequest,
    BedCompleteCleaningResponse
)
from backend.app.services.bed_service import bed_service

router = APIRouter(prefix="/api/beds", tags=["Beds"])


@router.post("/recommend", response_model=BedRecommendResponse)
def recommend_bed(request: BedRecommendRequest):
    """
    Deterministically recommend the most appropriate available bed based on
    patient triage priority, clinical high-risk status, unit preference,
    and capability/equipment requirements.
    """
    try:
        response = bed_service.recommend_bed(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/assign", response_model=BedAssignResponse)
def assign_bed(request: BedAssignRequest, db: Session = Depends(get_db)):
    """
    Execute bed assignment: updates bed state in the hospital profile to 'occupied',
    updates patient workflow status to 'assigned_bed', and persists the assignment in SQLite.
    """
    try:
        response = bed_service.assign_bed(db, request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/release", response_model=BedReleaseResponse)
def release_bed(request: BedReleaseRequest, db: Session = Depends(get_db)):
    """
    Release/discharge a patient from an occupied bed, moving the bed to cleaning status.
    """
    try:
        response = bed_service.release_bed(db, request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/complete-cleaning", response_model=BedCompleteCleaningResponse)
def complete_cleaning(request: BedCompleteCleaningRequest, db: Session = Depends(get_db)):
    """
    Complete sanitation on a cleaning bed and restore it to available status.
    """
    try:
        response = bed_service.complete_cleaning(db, request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

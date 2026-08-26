"""
PatientTriage.ai — Doctor Management API Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.schemas.doctor import (
    DoctorCheckInRequest,
    DoctorResponse,
    DoctorListResponse,
    DoctorAssignRequest,
    DoctorAssignResponse
)
from backend.app.services.doctor_service import doctor_service

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


@router.post("/check-in", response_model=DoctorResponse, status_code=status.HTTP_200_OK)
def check_in_doctor(request: DoctorCheckInRequest, db: Session = Depends(get_db)):
    """
    Check in a physician or update their shift status, availability, and active caseload.
    """
    try:
        doctor = doctor_service.check_in_doctor(db, request)
        return doctor
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=DoctorListResponse)
def list_doctors(
    specialty: Optional[str] = Query(None, description="Filter by specialty"),
    active_only: bool = Query(False, description="Filter only active on-shift doctors"),
    db: Session = Depends(get_db)
):
    """
    List all doctors tracked by the system with active availability and caseload counts.
    """
    try:
        return doctor_service.list_doctors(db, specialty=specialty, active_only=active_only)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/assign", response_model=DoctorAssignResponse)
def assign_doctor(request: DoctorAssignRequest, db: Session = Depends(get_db)):
    """
    Deterministically recommend and assign an on-shift physician based on specialty routing,
    availability, and active workload balance.
    """
    try:
        response = doctor_service.assign_doctor(db, request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND if "not found" in str(e).lower() else status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

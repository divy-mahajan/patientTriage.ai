"""
PatientTriage.ai — Hospital Capacity API Endpoints
"""

from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.hospital import (
    HospitalCapacityResponse,
    HospitalCapacityUpdateRequest,
    SwapProfileRequest
)
from backend.app.services.hospital_service import hospital_service

router = APIRouter(prefix="/api/hospital", tags=["Hospital Capacity"])


@router.get("/capacity", response_model=HospitalCapacityResponse)
def get_hospital_capacity():
    """
    Get the currently loaded hospital configuration profile and live capacity metrics.
    """
    try:
        state = hospital_service.get_capacity_state()
        return state
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/capacity", response_model=HospitalCapacityResponse)
def update_hospital_capacity(update_req: HospitalCapacityUpdateRequest):
    """
    Update runtime mutable capacity values (e.g. waiting room occupancy, surge status, or individual bed states).
    """
    try:
        updated_state = hospital_service.update_capacity(update_req)
        return updated_state
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/swap-profile", response_model=HospitalCapacityResponse)
def swap_hospital_profile(swap_req: SwapProfileRequest):
    """
    Dynamically swap the active hospital profile to another profile (e.g. metro_trauma_center).
    """
    try:
        new_state = hospital_service.swap_profile_by_id(swap_req.hospital_id)
        return new_state
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

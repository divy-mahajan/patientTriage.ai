"""
PatientTriage.ai — Doctor Roster & Assignment Schemas
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DoctorCheckInRequest(BaseModel):
    doctor_id: str = Field(..., description="Unique physician ID")
    name: str = Field(..., description="Physician name and credentials")
    specialty: str = Field(..., description="Primary clinical specialty")
    shift_status: str = Field("Active Shift", pattern="^(Active Shift|On Break|Off Duty)$")
    is_available: bool = True
    max_caseload: int = Field(5, ge=1, le=20)
    current_caseload: int = Field(0, ge=0)


class DoctorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    doctor_id: str
    name: str
    specialty: str
    shift_status: str
    is_available: bool
    max_caseload: int
    current_caseload: int
    last_checkin_at: datetime


class DoctorListResponse(BaseModel):
    total: int
    available_count: int
    doctors: List[DoctorResponse]


class DoctorAssignRequest(BaseModel):
    patient_id: str
    predicted_triage_level: Optional[int] = Field(None, ge=1, le=5)
    chief_complaint: Optional[str] = None
    age: Optional[int] = None
    manual_doctor_id: Optional[str] = None


class DoctorAssignResponse(BaseModel):
    assignment_id: int
    patient_id: str
    doctor: DoctorResponse
    assignment_rationale: str
    match_score: float
    assigned_at: datetime

"""
PatientTriage.ai — Hospital Capacity & Profile Schemas
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class BedStateUpdate(BaseModel):
    bed_id: str
    status: str = Field(..., description="Bed status", pattern="^(available|occupied|cleaning|reserved|unavailable)$")
    assigned_patient_id: Optional[str] = None
    cleaning_minutes_remaining: Optional[int] = None
    notes: Optional[str] = None


class HospitalCapacityUpdateRequest(BaseModel):
    waiting_room_occupancy: Optional[int] = Field(None, ge=0)
    waiting_room_capacity: Optional[int] = Field(None, ge=1)
    surge_status: Optional[str] = Field(None, pattern="^(normal|elevated|critical|tier_0|tier_1|tier_2|tier_3|tier_4|disaster)$")
    bed_updates: Optional[List[BedStateUpdate]] = None


class SwapProfileRequest(BaseModel):
    hospital_id: str = Field(..., description="Target hospital profile ID")


class HospitalProfileSummary(BaseModel):
    hospital_id: str
    name: str
    emergency_level: str
    address: str
    total_beds: int
    available_beds: int
    waiting_room_capacity: int
    is_active: bool = False


class HospitalProfilesListResponse(BaseModel):
    profiles: List[HospitalProfileSummary]
    active_hospital_id: str


class HospitalCapacityResponse(BaseModel):
    hospital_id: str
    name: Optional[str] = None
    emergency_level: Optional[str] = None
    address: Optional[str] = None
    summary: Dict[str, Any]
    waiting_room: Dict[str, Any]
    units: List[Dict[str, Any]]
    surge_status: Optional[str] = "normal"
    last_updated: Optional[datetime] = None
    equipment_inventory: Optional[Dict[str, Any]] = None
    active_staffing: Optional[Dict[str, Any]] = None

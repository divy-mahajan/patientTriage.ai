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
    surge_status: Optional[str] = Field(None, pattern="^(normal|elevated|critical)$")
    bed_updates: Optional[List[BedStateUpdate]] = None


class SwapProfileRequest(BaseModel):
    hospital_id: str = Field(..., description="Target hospital profile ID")


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

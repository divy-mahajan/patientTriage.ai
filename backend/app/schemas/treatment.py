"""
PatientTriage.ai — Patient Treatment & Prescription Schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class TreatmentCreate(BaseModel):
    patient_id: Optional[str] = None
    name: str
    type: str = Field(default="medication", description="infusion, medication, respiratory, oral")
    dose: str
    route: Optional[str] = "IV"
    frequency: Optional[str] = "Continuous"
    status: Optional[str] = "ACTIVE"
    start_time: Optional[datetime] = None
    next_administration: Optional[str] = None
    starting_quantity: Optional[float] = None
    remaining_quantity: Optional[float] = None
    quantity_unit: Optional[str] = "mL"
    infusion_rate: Optional[float] = None
    low_threshold: Optional[float] = 200.0


class TreatmentUpdate(BaseModel):
    name: Optional[str] = None
    dose: Optional[str] = None
    status: Optional[str] = None
    remaining_quantity: Optional[float] = None
    next_administration: Optional[str] = None


class TreatmentResponse(BaseModel):
    id: int
    patient_id: str
    name: str
    type: str
    dose: str
    route: Optional[str] = "IV"
    frequency: Optional[str] = "Continuous"
    status: str
    start_time: datetime
    next_administration: Optional[str] = None
    starting_quantity: Optional[float] = None
    remaining_quantity: Optional[float] = None
    quantity_unit: Optional[str] = "mL"
    infusion_rate: Optional[float] = None
    low_threshold: Optional[float] = 200.0
    is_low: bool = False
    is_replacement_required: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TreatmentListResponse(BaseModel):
    patient_id: Optional[str] = None
    treatments: List[TreatmentResponse] = Field(default_factory=list)
    total: int = 0

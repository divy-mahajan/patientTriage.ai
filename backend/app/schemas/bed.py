"""
PatientTriage.ai — Bed Recommendation & Assignment Schemas
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class BedRecommendRequest(BaseModel):
    patient_id: Optional[str] = None
    predicted_triage_level: int = Field(..., ge=1, le=5, example=2)
    is_high_risk: bool = Field(..., example=True)
    chief_complaint: str = Field(..., example="Acute severe chest pain with diaphoresis")
    symptoms: Optional[str] = Field("", example="Chest Pain; Shortness of Breath")
    medical_history: Optional[str] = Field("", example="Coronary Artery Disease")
    required_equipment: Optional[List[str]] = Field(default_factory=list, example=["cardiac_monitor", "oxygen_wall"])


class RecommendedBedOption(BaseModel):
    unit_id: str
    unit_name: str
    bed_id: str
    bed_label: str
    room_number: str
    equipment: List[str]
    match_score: float
    suitability_reasons: List[str]


class BedRecommendResponse(BaseModel):
    patient_id: Optional[str] = None
    recommended_bed: Optional[RecommendedBedOption] = None
    alternative_beds: List[RecommendedBedOption] = Field(default_factory=list)
    assignment_rationale: str
    deterministic_rule_chain: List[str]
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)


class BedAssignRequest(BaseModel):
    patient_id: str
    bed_id: str
    unit_id: Optional[str] = None
    notes: Optional[str] = None


class BedAssignResponse(BaseModel):
    assignment_id: int
    patient_id: str
    hospital_id: str
    unit_id: str
    unit_name: str
    bed_id: str
    bed_label: str
    status: str
    assigned_at: datetime
    message: str

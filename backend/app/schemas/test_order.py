"""
PatientTriage.ai — Diagnostic Test Recommendation Schemas
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class TestRecommendRequest(BaseModel):
    patient_id: Optional[str] = None
    chief_complaint: str = Field(..., min_length=2, example="Severe substernal chest pain radiating to left arm")
    symptoms: Optional[str] = Field("", example="Chest Pain; Diaphoresis; Shortness of Breath")
    medical_history: Optional[str] = Field("", example="Coronary Artery Disease; Hypertension")
    age: Optional[int] = Field(None, ge=0, le=125)


class SuggestedTestItem(BaseModel):
    code: str
    name: str
    category: str
    urgency: str
    typical_tat_minutes: int
    rationale: str


class TestRecommendResponse(BaseModel):
    patient_id: Optional[str] = None
    matched_complaint_category: str
    suggested_tests: List[SuggestedTestItem]
    is_rule_based: bool = True
    total_tests_recommended: int
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)

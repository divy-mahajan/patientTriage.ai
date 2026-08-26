"""
PatientTriage.ai — Triage Scoring & Explainability Schemas
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from backend.app.schemas.patient import PatientCreate


class TriageScoreRequest(BaseModel):
    patient_id: Optional[str] = Field(None, description="Existing patient ID in database to score")
    patient_data: Optional[PatientCreate] = Field(None, description="Direct patient payload to score without prior DB storage")


class FactorExplanation(BaseModel):
    factor: str
    detail: str
    contribution: float
    severity_impact: str


class TriageScoreResponse(BaseModel):
    patient_id: str
    predicted_triage_level: int
    triage_level_name: str
    risk_score: float
    is_high_risk: bool
    confidence: float
    class_probabilities: Dict[str, float]
    top_factors: List[FactorExplanation]
    raw_contributions: Optional[Dict[str, float]] = None
    prototype_disclaimer: str
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)

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
    age_group: str = Field(..., description="Pediatric (<18), Adult (18-64), or Geriatric (65+)")
    data_quality: str = Field(..., description="Complete or Limited")
    data_quality_issues: List[str] = Field(default_factory=list, description="Specific data completeness issues detected")
    needs_clinician_review: bool = Field(False, description="Whether informational ambiguity or risk necessitates clinician review")
    review_reason: Optional[str] = Field(None, description="Summary explanation of why clinician review is indicated")
    uncertainty_reason: Optional[str] = Field(None, description="Clinical reason for model uncertainty penalty if applicable")
    input_classification: Dict[str, str] = Field(default_factory=dict, description="Status for key inputs: KNOWN, UNKNOWN/UNSEEN, or MISSING")
    is_unseen_input: bool = Field(False, description="Whether unseen or out-of-vocabulary symptoms were parsed")
    missing_fields: List[str] = Field(default_factory=list, description="List of missing required fields")
    age_specific_notes: List[str] = Field(default_factory=list, description="Age-adjusted clinical guidance notes")
    prototype_disclaimer: str = Field(
        "Generated from synthetic prototype data for development and architecture demonstration. NOT clinically certified."
    )
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)

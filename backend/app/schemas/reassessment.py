"""
PatientTriage.ai — Real-Time Reassessment & Monitoring Schemas
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RecordVitalsRequest(BaseModel):
    heart_rate: float = Field(..., ge=0.0, le=300.0)
    sbp: float = Field(..., ge=30.0, le=300.0)
    dbp: float = Field(..., ge=15.0, le=200.0)
    spo2: float = Field(..., ge=40.0, le=100.0)
    respiratory_rate: float = Field(..., ge=2.0, le=80.0)
    temperature_c: float = Field(37.0, ge=25.0, le=45.0)
    gcs: float = Field(15.0, ge=3.0, le=15.0)
    clinician_observations: Optional[str] = ""
    actor: Optional[str] = "Triage Clinician"
    notes: Optional[str] = None


class ClinicianOverrideRequest(BaseModel):
    override_level: int = Field(..., ge=1, le=5)
    override_reason: str = Field(..., min_length=3)
    notes: Optional[str] = None
    clinician_name: Optional[str] = "Attending Clinician"


class VitalsSnapshot(BaseModel):
    heart_rate: float
    sbp: float
    dbp: float
    spo2: float
    respiratory_rate: float
    temperature_c: float
    gcs: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ReassessmentItem(BaseModel):
    id: int
    patient_id: str
    timestamp: datetime
    previous_triage_level: int
    current_triage_level: int
    previous_risk_score: float
    current_risk_score: float
    previous_vitals: Optional[Dict[str, Any]] = None
    current_vitals: Dict[str, Any]
    deterioration_detected: bool
    deterioration_factors: List[str] = Field(default_factory=list)
    reason_for_reassessment: str
    waiting_time_at_reassessment: int
    confidence: float
    clinician_review_required: bool
    clinician_override: bool
    override_level: Optional[int] = None
    override_reason: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReassessmentHistoryResponse(BaseModel):
    patient_id: str
    total_reassessments: int
    timeline: List[ReassessmentItem]


class MonitoringStatusResponse(BaseModel):
    patient_id: str
    full_name: str
    age: int
    gender: str
    effective_triage_level: int
    triage_level_name: str
    risk_score: float
    is_high_risk: bool
    confidence: float
    monitoring_status: str  # STABLE, MONITORING, REASSESSMENT DUE, DETERIORATING, CLINICIAN REVIEW
    minutes_since_last_assessment: int
    reassessment_interval_minutes: int
    minutes_until_next_due: int
    is_reassessment_due: bool
    is_deteriorating: bool
    needs_clinician_review: bool
    review_reasons: List[str] = Field(default_factory=list)
    deterioration_reasons: List[str] = Field(default_factory=list)
    surge_mode_active: bool = False
    surge_tier: str = "normal"
    latest_vitals: Dict[str, Any]
    vitals_trend: List[Dict[str, Any]] = Field(default_factory=list)
    total_reassessments_count: int = 0
    has_clinician_override: bool = False
    override_level: Optional[int] = None
    override_reason: Optional[str] = None


class ReassessmentAlert(BaseModel):
    alert_id: str
    patient_id: str
    patient_name: str
    severity: str  # critical, warning, info
    alert_type: str  # DETERIORATION, REASSESSMENT_DUE, LOW_CONFIDENCE_REVIEW
    message: str
    deterioration_factors: List[str] = Field(default_factory=list)
    previous_level: int
    current_level: int
    risk_score: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AlertsListResponse(BaseModel):
    alerts: List[ReassessmentAlert]
    total_alerts: int


class AuditLogResponse(BaseModel):
    id: int
    event_type: str
    patient_id: Optional[str] = None
    actor: str
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditListResponse(BaseModel):
    total: int
    logs: List[AuditLogResponse]

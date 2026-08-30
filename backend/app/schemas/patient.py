"""
PatientTriage.ai — Patient Intake & Record Schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator


class PatientCreate(BaseModel):
    patient_id: Optional[str] = None
    full_name: str = Field(..., min_length=1, max_length=128)
    dob: Optional[str] = Field(None)
    age: Optional[int] = Field(None, ge=0, le=125)
    gender: str = Field(...)
    arrival_mode: str = Field(...)
    arrival_timestamp: Optional[datetime] = None
    chief_complaint: str = Field(..., min_length=2)
    symptoms: Optional[str] = Field("")
    clinician_observations: Optional[str] = Field("")
    known_allergies: Optional[str] = Field("None known")
    medical_history: Optional[str] = Field("None")
    
    # Vital signs
    heart_rate: float = Field(..., ge=0.0, le=300.0)
    sbp: float = Field(..., ge=30.0, le=300.0)
    dbp: float = Field(..., ge=15.0, le=200.0)
    spo2: float = Field(..., ge=40.0, le=100.0)
    respiratory_rate: float = Field(..., ge=2.0, le=80.0)
    temperature_c: float = Field(37.0, ge=25.0, le=45.0)
    gcs: float = Field(15.0, ge=3.0, le=15.0)

    @model_validator(mode='after')
    def compute_age_if_missing(self):
        if self.age is None:
            if self.dob:
                try:
                    birth_year = int(self.dob.split('-')[0])
                    self.age = max(0, datetime.now().year - birth_year)
                except Exception:
                    self.age = 35
            else:
                self.age = 35
        return self


class PatientResponse(BaseModel):
    patient_id: str
    full_name: str
    dob: Optional[str] = None
    age: int
    gender: str
    arrival_mode: str
    arrival_timestamp: datetime
    chief_complaint: str
    symptoms: Optional[str] = None
    clinician_observations: Optional[str] = None
    known_allergies: Optional[str] = None
    medical_history: Optional[str] = None
    heart_rate: float
    sbp: float
    dbp: float
    spo2: float
    respiratory_rate: float
    temperature_c: float
    gcs: float
    status: str
    created_at: datetime

    # Triage Level & Decision Support Attributes
    predicted_triage_level: Optional[int] = None
    triage_level: Optional[int] = None
    triage_level_name: Optional[str] = None
    risk_score: Optional[float] = None
    is_high_risk: Optional[bool] = False
    confidence: Optional[float] = None
    age_group: Optional[str] = None
    data_quality: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PatientListResponse(BaseModel):
    total: int
    patients: List[PatientResponse]

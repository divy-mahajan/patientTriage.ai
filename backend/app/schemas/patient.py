"""
PatientTriage.ai — Patient Intake & Record Schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PatientCreate(BaseModel):
    patient_id: Optional[str] = None
    full_name: str = Field(..., min_length=1, max_length=128, example="Smith, John")
    dob: Optional[str] = Field(None, example="1980-05-12")
    age: int = Field(..., ge=0, le=125, example=45)
    gender: str = Field(..., example="M")
    arrival_mode: str = Field(..., example="Walk-in")
    arrival_timestamp: Optional[datetime] = None
    chief_complaint: str = Field(..., min_length=2, example="Acute substernal chest pain and shortness of breath")
    symptoms: Optional[str] = Field("", example="Chest Pain; Dyspnea; Diaphoresis")
    clinician_observations: Optional[str] = Field("", example="Pale / Diaphoretic; Severe distress")
    known_allergies: Optional[str] = Field("None known", example="Penicillin")
    medical_history: Optional[str] = Field("None", example="Hypertension; Coronary Artery Disease")
    
    # Vital signs
    heart_rate: float = Field(..., ge=0.0, le=300.0, example=118.0)
    sbp: float = Field(..., ge=30.0, le=300.0, example=135.0)
    dbp: float = Field(..., ge=15.0, le=200.0, example=85.0)
    spo2: float = Field(..., ge=40.0, le=100.0, example=92.0)
    respiratory_rate: float = Field(..., ge=2.0, le=80.0, example=24.0)
    temperature_c: float = Field(..., ge=25.0, le=45.0, example=37.2)
    gcs: float = Field(15.0, ge=3.0, le=15.0, example=14.0)


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

    model_config = ConfigDict(from_attributes=True)


class PatientListResponse(BaseModel):
    total: int
    patients: List[PatientResponse]

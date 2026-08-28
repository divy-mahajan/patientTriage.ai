"""
PatientTriage.ai — Clinician Authentication Schemas
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    clinician_id: str = Field(..., description="Unique clinician identifier, e.g., DOC-001")
    password: str = Field(..., min_length=4, description="Clinician account password")


class ClinicianProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    clinician_id: str
    name: str
    role: str
    department: str
    shift: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    clinician: ClinicianProfile
    message: str = "Authentication successful"

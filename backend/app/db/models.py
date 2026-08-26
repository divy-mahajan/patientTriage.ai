"""
PatientTriage.ai — SQLAlchemy Database Models
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.database import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String(64), primary_key=True, index=True)
    full_name = Column(String(128), nullable=False)
    dob = Column(String(32), nullable=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(8), nullable=False)
    arrival_mode = Column(String(64), nullable=False)
    arrival_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    chief_complaint = Column(Text, nullable=False)
    symptoms = Column(Text, nullable=True, default="")
    clinician_observations = Column(Text, nullable=True, default="")
    known_allergies = Column(Text, nullable=True, default="None known")
    medical_history = Column(Text, nullable=True, default="None")
    
    # Vital signs
    heart_rate = Column(Float, nullable=False)
    sbp = Column(Float, nullable=False)
    dbp = Column(Float, nullable=False)
    spo2 = Column(Float, nullable=False)
    respiratory_rate = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    gcs = Column(Float, nullable=False, default=15.0)

    # Workflow Status
    status = Column(String(32), default="waiting", nullable=False)  # waiting, triaged, assigned_bed, discharged
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    triage_assessments = relationship("TriageAssessment", back_populates="patient", cascade="all, delete-orphan")
    bed_assignments = relationship("BedAssignment", back_populates="patient", cascade="all, delete-orphan")
    doctor_assignments = relationship("DoctorAssignment", back_populates="patient", cascade="all, delete-orphan")


class TriageAssessment(Base):
    __tablename__ = "triage_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), ForeignKey("patients.patient_id"), nullable=False, index=True)
    predicted_triage_level = Column(Integer, nullable=False)
    triage_level_name = Column(String(64), nullable=False)
    risk_score = Column(Float, nullable=False)
    is_high_risk = Column(Boolean, nullable=False)
    confidence = Column(Float, nullable=False)
    
    # Structured JSON fields
    class_probabilities = Column(JSON, nullable=False)
    top_factors = Column(JSON, nullable=False)
    raw_contributions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="triage_assessments")


class BedAssignment(Base):
    __tablename__ = "bed_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), ForeignKey("patients.patient_id"), nullable=False, index=True)
    hospital_id = Column(String(64), nullable=False)
    unit_id = Column(String(64), nullable=False)
    unit_name = Column(String(128), nullable=False)
    bed_id = Column(String(64), nullable=False)
    bed_label = Column(String(64), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(32), default="active", nullable=False)  # active, completed, transferred
    assignment_rationale = Column(JSON, nullable=True)

    patient = relationship("Patient", back_populates="bed_assignments")


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    specialty = Column(String(64), nullable=False)
    shift_status = Column(String(32), default="Active Shift", nullable=False)  # Active Shift, On Break, Off Duty
    is_available = Column(Boolean, default=True, nullable=False)
    max_caseload = Column(Integer, default=5, nullable=False)
    current_caseload = Column(Integer, default=0, nullable=False)
    last_checkin_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assignments = relationship("DoctorAssignment", back_populates="doctor")


class DoctorAssignment(Base):
    __tablename__ = "doctor_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id = Column(String(64), ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(32), default="assigned", nullable=False)
    assignment_rationale = Column(JSON, nullable=True)

    patient = relationship("Patient", back_populates="doctor_assignments")
    doctor = relationship("Doctor", back_populates="assignments")

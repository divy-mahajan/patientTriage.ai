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
    
    # Vital signs (Latest recorded)
    heart_rate = Column(Float, nullable=False)
    sbp = Column(Float, nullable=False)
    dbp = Column(Float, nullable=False)
    spo2 = Column(Float, nullable=False)
    respiratory_rate = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    gcs = Column(Float, nullable=False, default=15.0)

    # Triage Level & Decision Support Metrics
    predicted_triage_level = Column(Integer, nullable=True)  # 1..5
    triage_level_name = Column(String(64), nullable=True)     # Resuscitation, Emergent, Urgent, Less Urgent, Non-Urgent
    risk_score = Column(Float, nullable=True)                # 0..100
    is_high_risk = Column(Boolean, nullable=True, default=False)
    confidence = Column(Float, nullable=True)                # 0..1
    age_group = Column(String(32), nullable=True)             # Pediatric, Adult, Geriatric
    data_quality = Column(String(32), nullable=True)          # Complete, Limited

    # Continuous Monitoring & Dynamic Reassessment
    last_reassessment_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    monitoring_status = Column(String(32), default="STABLE", nullable=False)  # STABLE, MONITORING, REASSESSMENT DUE, DETERIORATING, CLINICIAN REVIEW
    vitals_history = Column(JSON, nullable=True, default=list)
    clinician_override_level = Column(Integer, nullable=True)
    clinician_override_reason = Column(Text, nullable=True)

    # Workflow Status
    status = Column(String(32), default="waiting", nullable=False)  # waiting, triaged, assigned_bed, discharged
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    triage_assessments = relationship("TriageAssessment", back_populates="patient", cascade="all, delete-orphan")
    reassessments = relationship("PatientReassessment", back_populates="patient", cascade="all, delete-orphan")
    bed_assignments = relationship("BedAssignment", back_populates="patient", cascade="all, delete-orphan")
    doctor_assignments = relationship("DoctorAssignment", back_populates="patient", cascade="all, delete-orphan")
    treatments = relationship("PatientTreatment", back_populates="patient", cascade="all, delete-orphan")


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


class PatientReassessment(Base):
    __tablename__ = "patient_reassessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), ForeignKey("patients.patient_id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    previous_triage_level = Column(Integer, nullable=False)
    current_triage_level = Column(Integer, nullable=False)
    previous_risk_score = Column(Float, nullable=False)
    current_risk_score = Column(Float, nullable=False)
    previous_vitals = Column(JSON, nullable=True)
    current_vitals = Column(JSON, nullable=False)
    deterioration_detected = Column(Boolean, default=False, nullable=False)
    deterioration_factors = Column(JSON, nullable=True)
    reason_for_reassessment = Column(String(256), nullable=False)
    waiting_time_at_reassessment = Column(Integer, default=0, nullable=False)
    confidence = Column(Float, default=0.85, nullable=False)
    clinician_review_required = Column(Boolean, default=False, nullable=False)
    clinician_override = Column(Boolean, default=False, nullable=False)
    override_level = Column(Integer, nullable=True)
    override_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="reassessments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(64), nullable=False, index=True)
    patient_id = Column(String(64), nullable=True, index=True)
    actor = Column(String(128), default="System", nullable=False)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


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


class Clinician(Base):
    __tablename__ = "clinicians"

    clinician_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    role = Column(String(64), nullable=False)  # e.g., "Attending Triage Officer"
    department = Column(String(64), default="Emergency Department", nullable=False)
    shift = Column(String(64), default="07:00–19:00", nullable=False)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PatientTreatment(Base):
    __tablename__ = "patient_treatments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(64), ForeignKey("patients.patient_id"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    type = Column(String(64), nullable=False, default="medication")  # infusion, medication, respiratory, oral
    dose = Column(String(64), nullable=False)  # e.g. "100 mL/hr", "1 g IV", "4 L/min"
    route = Column(String(64), nullable=True, default="IV")
    frequency = Column(String(64), nullable=True, default="Continuous")
    status = Column(String(32), default="ACTIVE", nullable=False)  # ACTIVE, RUNNING, PAUSED, COMPLETED, LOW, REPLACEMENT REQUIRED
    start_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    next_administration = Column(String(64), nullable=True)
    starting_quantity = Column(Float, nullable=True)  # e.g. 1000.0
    remaining_quantity = Column(Float, nullable=True)  # e.g. 650.0
    quantity_unit = Column(String(32), nullable=True, default="mL")
    infusion_rate = Column(Float, nullable=True)  # e.g. 100.0 (mL/hr)
    low_threshold = Column(Float, nullable=True, default=200.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="treatments")

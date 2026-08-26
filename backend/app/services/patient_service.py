"""
PatientTriage.ai — Patient Database Service

Handles creating, retrieving, and updating patient records in SQLite.
"""

from typing import List, Optional
from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from backend.app.db.models import Patient
from backend.app.schemas.patient import PatientCreate


class PatientService:
    @staticmethod
    def create_patient(db: Session, patient_in: PatientCreate) -> Patient:
        """Create and store a new patient in the database."""
        p_id = patient_in.patient_id or f"P-{int(uuid.uuid4().int % 90000 + 10000)}"
        arrival_ts = patient_in.arrival_timestamp or datetime.utcnow()

        db_patient = Patient(
            patient_id=p_id,
            full_name=patient_in.full_name,
            dob=patient_in.dob,
            age=patient_in.age,
            gender=patient_in.gender,
            arrival_mode=patient_in.arrival_mode,
            arrival_timestamp=arrival_ts,
            chief_complaint=patient_in.chief_complaint,
            symptoms=patient_in.symptoms or "",
            clinician_observations=patient_in.clinician_observations or "",
            known_allergies=patient_in.known_allergies or "None known",
            medical_history=patient_in.medical_history or "None",
            heart_rate=patient_in.heart_rate,
            sbp=patient_in.sbp,
            dbp=patient_in.dbp,
            spo2=patient_in.spo2,
            respiratory_rate=patient_in.respiratory_rate,
            temperature_c=patient_in.temperature_c,
            gcs=patient_in.gcs,
            status="waiting",
            created_at=datetime.utcnow()
        )
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        return db_patient

    @staticmethod
    def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
        """Fetch a single patient by ID."""
        return db.query(Patient).filter(Patient.patient_id == patient_id).first()

    @staticmethod
    def list_patients(
        db: Session,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Patient]:
        """List patients with optional status filtering."""
        query = db.query(Patient)
        if status:
            query = query.filter(Patient.status == status)
        return query.order_by(Patient.arrival_timestamp.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_patients(db: Session, status: Optional[str] = None) -> int:
        """Count total patients."""
        query = db.query(Patient)
        if status:
            query = query.filter(Patient.status == status)
        return query.count()

    @staticmethod
    def update_patient_status(db: Session, patient_id: str, new_status: str) -> Optional[Patient]:
        """Update patient workflow status."""
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if patient:
            patient.status = new_status
            db.commit()
            db.refresh(patient)
        return patient


patient_service = PatientService()

"""
PatientTriage.ai — Patient Database Service

Handles creating, retrieving, and updating patient records in SQLite with:
- Duplicate intake prevention
- Automatic ML triage scoring & level assignment (L1-L5)
- Age cohort classification (Pediatric, Adult, Geriatric)
- Separation of risk_score and is_high_risk from predicted_triage_level
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import os
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.db.models import Patient, TriageAssessment
from backend.app.schemas.patient import PatientCreate

LEVEL_NAMES = {
    1: "Resuscitation",
    2: "Emergent",
    3: "Urgent",
    4: "Less Urgent",
    5: "Non-Urgent"
}


class PatientService:
    @staticmethod
    def create_patient(db: Session, patient_in: PatientCreate) -> Patient:
        """Create and store a new patient in the database with duplicate protection and immediate triage scoring."""
        if patient_in.patient_id:
            existing_by_id = db.query(Patient).filter(Patient.patient_id == patient_in.patient_id).first()
            if existing_by_id:
                return existing_by_id
            p_id = patient_in.patient_id
        else:
            # Check for rapid duplicate submission (same name, age, chief complaint created within last 2 minutes)
            two_mins_ago = datetime.utcnow() - timedelta(minutes=2)
            recent_duplicate = db.query(Patient).filter(
                Patient.full_name == patient_in.full_name.strip(),
                Patient.age == patient_in.age,
                Patient.chief_complaint == patient_in.chief_complaint.strip(),
                Patient.created_at >= two_mins_ago
            ).first()

            if recent_duplicate:
                return recent_duplicate

            p_id = f"P-{int(uuid.uuid4().int % 90000 + 10000)}"

        arrival_ts = patient_in.arrival_timestamp or datetime.utcnow()

        # Evaluate age group
        age = patient_in.age
        age_group = "Pediatric" if age < 18 else "Geriatric" if age >= 65 else "Adult"

        # Evaluate initial triage score using ML predictor / physiological rules
        initial_level = 3
        initial_risk = 50.0
        initial_high_risk = False
        initial_conf = 0.85
        try:
            from backend.app.services.triage_service import triage_service
            from backend.app.schemas.triage import TriageScoreRequest
            # Build scoring input
            rec = {
                "patient_id": p_id,
                "full_name": patient_in.full_name,
                "age": age,
                "gender": patient_in.gender,
                "arrival_mode": patient_in.arrival_mode,
                "chief_complaint": patient_in.chief_complaint,
                "symptoms": patient_in.symptoms or "",
                "clinician_observations": patient_in.clinician_observations or "",
                "medical_history": patient_in.medical_history or "None",
                "known_allergies": patient_in.known_allergies or "None known",
                "heart_rate": patient_in.heart_rate,
                "sbp": patient_in.sbp,
                "dbp": patient_in.dbp,
                "spo2": patient_in.spo2,
                "respiratory_rate": patient_in.respiratory_rate,
                "temperature_c": patient_in.temperature_c,
                "gcs": patient_in.gcs
            }
            pred = triage_service.predictor.predict(rec)
            initial_level = int(pred.get("predicted_triage_level", 3))
            initial_risk = float(pred.get("risk_score", 50.0))
            initial_high_risk = bool(pred.get("is_high_risk", False))
            initial_conf = float(pred.get("confidence", 0.85))
        except Exception as err:
            print(f"Warning: Failed to run initial triage scoring for new patient {p_id}: {err}")

        db_patient = Patient(
            patient_id=p_id,
            full_name=patient_in.full_name.strip(),
            dob=patient_in.dob,
            age=patient_in.age,
            gender=patient_in.gender,
            arrival_mode=patient_in.arrival_mode,
            arrival_timestamp=arrival_ts,
            chief_complaint=patient_in.chief_complaint.strip(),
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
            predicted_triage_level=initial_level,
            triage_level_name=LEVEL_NAMES.get(initial_level, "Urgent"),
            risk_score=initial_risk,
            is_high_risk=initial_high_risk,
            confidence=initial_conf,
            age_group=age_group,
            data_quality="Complete",
            status="waiting",
            created_at=datetime.utcnow()
        )
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        return db_patient

    @staticmethod
    def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
        """Fetch a single patient by ID and ensure triage fields are populated."""
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if patient and (patient.predicted_triage_level is None or patient.predicted_triage_level == 0):
            PatientService._backfill_patient_triage(db, patient)
        return patient

    @staticmethod
    def list_patients(
        db: Session,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Patient]:
        """List patients with optional status filtering and ensure triage levels are present."""
        query = db.query(Patient)
        if status:
            query = query.filter(Patient.status == status)
        patients = query.order_by(Patient.arrival_timestamp.desc()).offset(skip).limit(limit).all()

        # Check for any un-scored records and backfill them
        needs_commit = False
        for p in patients:
            if p.predicted_triage_level is None or p.predicted_triage_level == 0:
                PatientService._backfill_patient_triage(db, p, commit=False)
                needs_commit = True
        if needs_commit:
            db.commit()

        return patients

    @staticmethod
    def count_patients(db: Session, status: Optional[str] = None) -> int:
        """Count total patients."""
        query = db.query(Patient)
        if status:
            query = query.filter(Patient.status == status)
        return query.count()

    @staticmethod
    def _backfill_patient_triage(db: Session, patient: Patient, commit: bool = True):
        """Internal helper to calculate and store triage metrics if missing."""
        try:
            from backend.app.services.triage_service import triage_service
            rec = {
                "patient_id": patient.patient_id,
                "full_name": patient.full_name,
                "age": patient.age,
                "gender": patient.gender,
                "arrival_mode": patient.arrival_mode,
                "chief_complaint": patient.chief_complaint,
                "symptoms": patient.symptoms or "",
                "clinician_observations": patient.clinician_observations or "",
                "medical_history": patient.medical_history or "None",
                "known_allergies": patient.known_allergies or "None known",
                "heart_rate": patient.heart_rate,
                "sbp": patient.sbp,
                "dbp": patient.dbp,
                "spo2": patient.spo2,
                "respiratory_rate": patient.respiratory_rate,
                "temperature_c": patient.temperature_c,
                "gcs": patient.gcs
            }
            pred = triage_service.predictor.predict(rec)
            lvl = int(pred.get("predicted_triage_level", 3))
            patient.predicted_triage_level = lvl
            patient.triage_level_name = LEVEL_NAMES.get(lvl, "Urgent")
            patient.risk_score = float(pred.get("risk_score", 50.0))
            patient.is_high_risk = bool(pred.get("is_high_risk", False))
            patient.confidence = float(pred.get("confidence", 0.85))
            patient.age_group = "Pediatric" if patient.age < 18 else "Geriatric" if patient.age >= 65 else "Adult"
            patient.data_quality = "Complete"
            if commit:
                db.commit()
        except Exception as e:
            print(f"Error backfilling triage for {patient.patient_id}: {e}")

    @staticmethod
    def seed_initial_patients_if_empty(db: Session, max_count: int = 50):
        """Seed initial patient cohort from synthetic CSV preserving all 5 ESI levels."""
        if os.path.exists(settings.patients_synthetic_path):
            df = pd.read_csv(settings.patients_synthetic_path)
            # Pick a diverse sample across all 5 ESI levels
            sample_df = df.head(max_count)

            for _, row in sample_df.iterrows():
                p_id = str(row["patient_id"])
                existing = db.query(Patient).filter(Patient.patient_id == p_id).first()
                if existing:
                    # Ensure existing seed patient has the correct synthetic ESI level
                    if existing.predicted_triage_level is None or existing.predicted_triage_level == 0:
                        esi_lvl = int(row.get("synthetic_esi_level", 3))
                        existing.predicted_triage_level = esi_lvl
                        existing.triage_level_name = LEVEL_NAMES.get(esi_lvl, "Urgent")
                        existing.risk_score = float(row.get("synthetic_risk_score", 50.0))
                        existing.is_high_risk = bool(row.get("is_high_risk", False))
                        existing.confidence = 0.90
                        existing.age_group = "Pediatric" if existing.age < 18 else "Geriatric" if existing.age >= 65 else "Adult"
                        existing.data_quality = "Complete"
                    continue

                age = int(row.get("age", 45))
                esi_lvl = int(row.get("synthetic_esi_level", 3))
                risk_sc = float(row.get("synthetic_risk_score", 50.0))
                high_risk = bool(row.get("is_high_risk", False))

                p = Patient(
                    patient_id=p_id,
                    full_name=str(row.get("full_name", "Unknown Patient")),
                    dob=str(row.get("dob", "1980-01-01")),
                    age=age,
                    gender=str(row.get("gender", "M")),
                    arrival_mode=str(row.get("arrival_mode", "Walk-in")),
                    arrival_timestamp=datetime.utcnow() - timedelta(minutes=int(row.name * 5)),
                    chief_complaint=str(row.get("chief_complaint", "General triage intake")),
                    symptoms=str(row.get("symptoms", "")),
                    clinician_observations=str(row.get("clinician_observations", "")),
                    known_allergies=str(row.get("known_allergies", "None known")),
                    medical_history=str(row.get("medical_history", "None")),
                    heart_rate=float(row.get("heart_rate", 80.0)),
                    sbp=float(row.get("sbp", 120.0)),
                    dbp=float(row.get("dbp", 80.0)),
                    spo2=float(row.get("spo2", 98.0)),
                    respiratory_rate=float(row.get("respiratory_rate", 16.0)),
                    temperature_c=float(row.get("temperature_c", 37.0)),
                    gcs=float(row.get("gcs", 15.0)),
                    predicted_triage_level=esi_lvl,
                    triage_level_name=LEVEL_NAMES.get(esi_lvl, "Urgent"),
                    risk_score=risk_sc,
                    is_high_risk=high_risk,
                    confidence=0.90,
                    age_group="Pediatric" if age < 18 else "Geriatric" if age >= 65 else "Adult",
                    data_quality="Complete",
                    status=str(row.get("status", "waiting")),
                    created_at=datetime.utcnow()
                )
                db.add(p)
            db.commit()


patient_service = PatientService()

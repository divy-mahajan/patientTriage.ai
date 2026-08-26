"""
PatientTriage.ai — Triage Service (ML Model Orchestration)

Orchestrates:
- Invoking the interpretable Logistic Regression model from model/predictor.py
- Injecting live contextual hospital waiting room metrics
- Persisting TriageAssessment records in SQLite
- Updating patient workflow status to 'triaged'
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.models import Patient, TriageAssessment
from backend.app.schemas.patient import PatientCreate
from backend.app.schemas.triage import TriageScoreRequest, TriageScoreResponse, FactorExplanation
from backend.app.services.hospital_service import hospital_service
from model.predictor import TriagePredictor


class TriageService:
    def __init__(self):
        self._predictor = None

    @property
    def predictor(self) -> TriagePredictor:
        """Lazy load predictor singleton."""
        if self._predictor is None:
            self._predictor = TriagePredictor(artifact_path=settings.model_artifact_path)
        return self._predictor

    def score_patient(self, db: Optional[Session], request: TriageScoreRequest) -> TriageScoreResponse:
        """
        Score a patient using either a stored DB patient or a direct patient payload.
        Injects live hospital capacity context.
        """
        patient_dict: Dict[str, Any] = {}
        target_patient_id = "P-UNSAVED"

        if request.patient_id:
            if not db:
                raise ValueError("Database session required when querying by patient_id")
            patient_obj = db.query(Patient).filter(Patient.patient_id == request.patient_id).first()
            if not patient_obj:
                raise ValueError(f"Patient with ID '{request.patient_id}' not found")
            target_patient_id = patient_obj.patient_id
            patient_dict = {
                "patient_id": patient_obj.patient_id,
                "full_name": patient_obj.full_name,
                "dob": patient_obj.dob,
                "age": patient_obj.age,
                "gender": patient_obj.gender,
                "arrival_mode": patient_obj.arrival_mode,
                "chief_complaint": patient_obj.chief_complaint,
                "symptoms": patient_obj.symptoms or "",
                "clinician_observations": patient_obj.clinician_observations or "",
                "known_allergies": patient_obj.known_allergies or "None known",
                "medical_history": patient_obj.medical_history or "None",
                "heart_rate": patient_obj.heart_rate,
                "sbp": patient_obj.sbp,
                "dbp": patient_obj.dbp,
                "spo2": patient_obj.spo2,
                "respiratory_rate": patient_obj.respiratory_rate,
                "temperature_c": patient_obj.temperature_c,
                "gcs": patient_obj.gcs
            }
        elif request.patient_data:
            p_in = request.patient_data
            target_patient_id = p_in.patient_id or "P-DIRECT"
            patient_dict = p_in.model_dump()
            patient_dict["patient_id"] = target_patient_id
        else:
            raise ValueError("Must provide either patient_id or patient_data in request")

        # 1. Fetch live hospital capacity context
        capacity_context = hospital_service.get_capacity_state()

        # 2. Run inference with interpretable model
        raw_res = self.predictor.predict(patient_dict, hospital_capacity=capacity_context)

        # 3. Format factor explanations
        factors = [
            FactorExplanation(
                factor=f["factor"],
                detail=f["detail"],
                contribution=f["contribution"],
                severity_impact=f["severity_impact"]
            )
            for f in raw_res.get("top_factors", [])
        ]

        response = TriageScoreResponse(
            patient_id=target_patient_id,
            predicted_triage_level=raw_res["predicted_triage_level"],
            triage_level_name=raw_res["triage_level_name"],
            risk_score=raw_res["risk_score"],
            is_high_risk=raw_res["is_high_risk"],
            confidence=raw_res["confidence"],
            class_probabilities=raw_res["class_probabilities"],
            top_factors=factors,
            raw_contributions=raw_res.get("raw_contributions"),
            prototype_disclaimer=raw_res.get(
                "prototype_disclaimer",
                "Generated from synthetic prototype data for development. NOT clinically certified."
            ),
            evaluated_at=datetime.utcnow()
        )

        # 4. If patient exists in DB, persist assessment and update status
        if db and request.patient_id:
            assessment_record = TriageAssessment(
                patient_id=request.patient_id,
                predicted_triage_level=response.predicted_triage_level,
                triage_level_name=response.triage_level_name,
                risk_score=response.risk_score,
                is_high_risk=response.is_high_risk,
                confidence=response.confidence,
                class_probabilities=response.class_probabilities,
                top_factors=[f.model_dump() for f in response.top_factors],
                raw_contributions=response.raw_contributions,
                created_at=datetime.utcnow()
            )
            db.add(assessment_record)

            patient_obj = db.query(Patient).filter(Patient.patient_id == request.patient_id).first()
            if patient_obj and patient_obj.status == "waiting":
                patient_obj.status = "triaged"

            db.commit()

        return response


triage_service = TriageService()

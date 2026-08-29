"""
PatientTriage.ai — Real-Time Patient Reassessment & Monitoring Service

Core Clinical Logic:
- Acuity-based wait-time reassessment triggers (L1..L5)
- Surge-adaptive interval compression
- Clinically explainable vital sign deterioration detection
- Safe ML re-inference preserving model feature vocabulary without silent downgrades
- Complete assessment & reassessment timeline persistence
- Clinician override management & immutable audit logging
"""

import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.models import Patient, PatientReassessment, AuditLog, TriageAssessment
from backend.app.schemas.reassessment import (
    RecordVitalsRequest,
    ClinicianOverrideRequest,
    MonitoringStatusResponse,
    ReassessmentItem,
    ReassessmentHistoryResponse,
    ReassessmentAlert,
    AlertsListResponse,
    AuditLogResponse,
    AuditListResponse
)
from backend.app.services.hospital_service import hospital_service
from backend.app.services.triage_service import triage_service
from backend.app.services.age_service import age_service
from backend.app.services.data_quality_service import data_quality_service

# Configurable prototype reassessment intervals by ESI tier (minutes)
BASE_REASSESSMENT_THRESHOLDS = {
    1: 5,     # Level 1: Immediate / continuous (5m check)
    2: 15,    # Level 2: ~15 minutes
    3: 30,    # Level 3: ~30 minutes
    4: 60,    # Level 4: ~60 minutes
    5: 120    # Level 5: ~120 minutes
}

SURGE_INTERVAL_MULTIPLIERS = {
    "normal": 1.0,
    "tier_0": 1.0,
    "elevated": 0.67,  # ~33% faster intervals
    "tier_1": 0.67,
    "critical": 0.50,  # ~50% faster intervals
    "tier_2": 0.50,
    "disaster": 0.33,  # ~67% faster intervals
    "tier_3": 0.33,
    "tier_4": 0.33
}

LEVEL_NAMES = {
    1: "Resuscitation",
    2: "Emergent",
    3: "Urgent",
    4: "Less Urgent",
    5: "Non-Urgent"
}


class ReassessmentService:
    @staticmethod
    def get_monitoring_interval(triage_level: int, surge_status: str = "normal") -> int:
        """Calculate dynamic monitoring interval (minutes) scaled by hospital surge mode."""
        base_mins = BASE_REASSESSMENT_THRESHOLDS.get(triage_level, 30)
        multiplier = SURGE_INTERVAL_MULTIPLIERS.get(surge_status.lower(), 1.0)
        return max(3, int(round(base_mins * multiplier)))

    @staticmethod
    def detect_vital_deterioration(prev: Dict[str, Any], curr: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Compare previous vitals vs new vitals and identify clinically significant deterioration.
        Returns (is_deteriorating, list_of_explicit_reasons).
        """
        reasons = []

        # 1. Oxygen Saturation (SpO2)
        p_spo2 = float(prev.get("spo2", 98.0))
        c_spo2 = float(curr.get("spo2", 98.0))
        if (p_spo2 - c_spo2 >= 3.0 and c_spo2 < 95.0) or c_spo2 < 90.0:
            reasons.append(f"SpO2 decreased: {int(p_spo2)}% → {int(c_spo2)}% (desaturation below safe baseline)")
        elif p_spo2 - c_spo2 >= 4.0:
            reasons.append(f"SpO2 decreased: {int(p_spo2)}% → {int(c_spo2)}%")

        # 2. Heart Rate (HR)
        p_hr = float(prev.get("heart_rate", 80.0))
        c_hr = float(curr.get("heart_rate", 80.0))
        if c_hr - p_hr >= 20.0 and c_hr > 105.0:
            reasons.append(f"Heart rate increased: {int(p_hr)} → {int(c_hr)} bpm (acute tachycardia)")
        elif p_hr - c_hr >= 25.0 and c_hr < 55.0:
            reasons.append(f"Heart rate dropped: {int(p_hr)} → {int(c_hr)} bpm (acute bradycardia)")

        # 3. Blood Pressure (SBP)
        p_sbp = float(prev.get("sbp", 120.0))
        c_sbp = float(curr.get("sbp", 120.0))
        if p_sbp - c_sbp >= 20.0 and c_sbp < 95.0:
            reasons.append(f"Blood pressure dropped: {int(p_sbp)} → {int(c_sbp)} mmHg (hypotensive trend)")
        elif c_sbp - p_sbp >= 35.0 and c_sbp > 185.0:
            reasons.append(f"Blood pressure spiked: {int(p_sbp)} → {int(c_sbp)} mmHg (severe hypertensive crisis)")

        # 4. Respiratory Rate (RR)
        p_rr = float(prev.get("respiratory_rate", 16.0))
        c_rr = float(curr.get("respiratory_rate", 16.0))
        if c_rr - p_rr >= 5.0 and c_rr > 22.0:
            reasons.append(f"Respiratory rate increased: {int(p_rr)} → {int(c_rr)} /min (tachypnea)")
        elif c_rr < 10.0 and p_rr >= 12.0:
            reasons.append(f"Respiratory rate depressed: {int(p_rr)} → {int(c_rr)} /min (hypoventilation)")

        # 5. Glasgow Coma Scale (GCS)
        p_gcs = float(prev.get("gcs", 15.0))
        c_gcs = float(curr.get("gcs", 15.0))
        if p_gcs - c_gcs >= 1.0 and c_gcs <= 14.0:
            reasons.append(f"GCS decreased: {int(p_gcs)} → {int(c_gcs)} (altered mental status)")

        # 6. Temperature
        p_temp = float(prev.get("temperature_c", 37.0))
        c_temp = float(curr.get("temperature_c", 37.0))
        if c_temp - p_temp >= 1.2 and c_temp >= 38.4:
            reasons.append(f"Temperature spiked: {p_temp:.1f}°C → {c_temp:.1f}°C (febrile escalation)")

        is_deteriorating = len(reasons) > 0
        return is_deteriorating, reasons

    @staticmethod
    def get_patient_monitoring_status(db: Session, patient: Patient) -> MonitoringStatusResponse:
        """Compute live monitoring status, remaining time until due, and deterioration state for a patient."""
        # Active surge state
        cap = hospital_service.get_capacity_state()
        surge_status = cap.get("surge_status", "normal")
        is_surge = surge_status in ["elevated", "critical", "disaster", "tier_1", "tier_2", "tier_3"]

        effective_level = patient.clinician_override_level or patient.predicted_triage_level or 3
        interval_mins = ReassessmentService.get_monitoring_interval(effective_level, surge_status)

        last_ts = patient.last_reassessment_timestamp or patient.arrival_timestamp or patient.created_at
        now = datetime.utcnow()
        mins_since = max(0, int((now - last_ts).total_seconds() / 60.0))
        mins_until_due = max(0, interval_mins - mins_since)
        is_due = mins_since >= interval_mins

        # Parse vitals history
        history_list = []
        if patient.vitals_history:
            try:
                history_list = json.loads(patient.vitals_history) if isinstance(patient.vitals_history, str) else patient.vitals_history
            except Exception:
                history_list = []

        # Current vitals snapshot
        curr_vitals = {
            "heart_rate": patient.heart_rate,
            "sbp": patient.sbp,
            "dbp": patient.dbp,
            "spo2": patient.spo2,
            "respiratory_rate": patient.respiratory_rate,
            "temperature_c": patient.temperature_c,
            "gcs": patient.gcs
        }

        # Check latest reassessment for deterioration details
        latest_re = db.query(PatientReassessment).filter(
            PatientReassessment.patient_id == patient.patient_id
        ).order_by(PatientReassessment.timestamp.desc()).first()

        is_deteriorating = False
        det_reasons = []
        review_reasons = []

        if latest_re:
            is_deteriorating = bool(latest_re.deterioration_detected)
            det_reasons = latest_re.deterioration_factors or []
            if latest_re.clinician_review_required:
                review_reasons.append(latest_re.reason_for_reassessment)

        # Compute dynamic monitoring status
        if is_deteriorating:
            mon_status = "DETERIORATING"
        elif len(review_reasons) > 0:
            mon_status = "CLINICIAN REVIEW"
        elif is_due:
            mon_status = "REASSESSMENT DUE"
        elif mins_since >= interval_mins * 0.7:
            mon_status = "MONITORING"
        else:
            mon_status = "STABLE"

        return MonitoringStatusResponse(
            patient_id=patient.patient_id,
            full_name=patient.full_name,
            age=patient.age,
            gender=patient.gender,
            effective_triage_level=effective_level,
            triage_level_name=LEVEL_NAMES.get(effective_level, "Urgent"),
            risk_score=patient.risk_score or 50.0,
            is_high_risk=patient.is_high_risk or False,
            confidence=patient.confidence or 0.85,
            monitoring_status=mon_status,
            minutes_since_last_assessment=mins_since,
            reassessment_interval_minutes=interval_mins,
            minutes_until_next_due=mins_until_due,
            is_reassessment_due=is_due,
            is_deteriorating=is_deteriorating,
            needs_clinician_review=len(review_reasons) > 0,
            review_reasons=review_reasons,
            deterioration_reasons=det_reasons,
            surge_mode_active=is_surge,
            surge_tier=surge_status,
            latest_vitals=curr_vitals,
            vitals_trend=history_list,
            total_reassessments_count=db.query(PatientReassessment).filter(PatientReassessment.patient_id == patient.patient_id).count(),
            has_clinician_override=patient.clinician_override_level is not None,
            override_level=patient.clinician_override_level,
            override_reason=patient.clinician_override_reason
        )

    @staticmethod
    def record_new_vitals_and_reassess(
        db: Session,
        patient_id: str,
        vitals_in: RecordVitalsRequest
    ) -> ReassessmentItem:
        """
        Record new patient vital signs, evaluate clinical deterioration, run model inference
        preserving feature schema, persist reassessment record and trigger audit logs.
        """
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient with ID '{patient_id}' not found")

        prev_vitals = {
            "heart_rate": patient.heart_rate,
            "sbp": patient.sbp,
            "dbp": patient.dbp,
            "spo2": patient.spo2,
            "respiratory_rate": patient.respiratory_rate,
            "temperature_c": patient.temperature_c,
            "gcs": patient.gcs
        }

        curr_vitals = {
            "heart_rate": vitals_in.heart_rate,
            "sbp": vitals_in.sbp,
            "dbp": vitals_in.dbp,
            "spo2": vitals_in.spo2,
            "respiratory_rate": vitals_in.respiratory_rate,
            "temperature_c": vitals_in.temperature_c,
            "gcs": vitals_in.gcs
        }

        # 1. Detect Vital Sign Deterioration
        is_deteriorating, det_reasons = ReassessmentService.detect_vital_deterioration(prev_vitals, curr_vitals)

        # 2. Prepare exact feature schema for ML model inference (No feature fabrication)
        obs = patient.clinician_observations or ""
        if vitals_in.clinician_observations:
            obs = f"{obs}; {vitals_in.clinician_observations}".strip("; ")

        patient_scoring_record = {
            "patient_id": patient.patient_id,
            "full_name": patient.full_name,
            "dob": patient.dob,
            "age": patient.age,
            "gender": patient.gender,
            "arrival_mode": patient.arrival_mode,
            "chief_complaint": patient.chief_complaint,
            "symptoms": patient.symptoms or "",
            "clinician_observations": obs,
            "known_allergies": patient.known_allergies or "None known",
            "medical_history": patient.medical_history or "None",
            "heart_rate": vitals_in.heart_rate,
            "sbp": vitals_in.sbp,
            "dbp": vitals_in.dbp,
            "spo2": vitals_in.spo2,
            "respiratory_rate": vitals_in.respiratory_rate,
            "temperature_c": vitals_in.temperature_c,
            "gcs": vitals_in.gcs
        }

        # 3. Run ML model & safe rules
        cap_state = hospital_service.get_capacity_state()
        pred_res = triage_service.predictor.predict(patient_scoring_record, hospital_capacity=cap_state)
        dq_eval = data_quality_service.evaluate_data_quality(patient_scoring_record)

        new_triage_level = int(pred_res["predicted_triage_level"])
        new_risk_score = float(pred_res["risk_score"])
        new_is_high_risk = bool(pred_res["is_high_risk"])
        new_conf = float(pred_res["confidence"])

        # Safety-First Rule: If deterioration detected but model didn't escalate, ensure clinician review
        clinician_review_needed = dq_eval["needs_clinician_review"] or is_deteriorating
        reason_str = "Routine periodic reassessment"
        if is_deteriorating:
            reason_str = f"Clinical deterioration detected: {'; '.join(det_reasons[:2])}"
        elif dq_eval["needs_clinician_review"]:
            reason_str = f"Data uncertainty review: {dq_eval['review_reason']}"

        prev_level = patient.predicted_triage_level or 3
        prev_risk = patient.risk_score or 50.0

        # 4. Update Patient Record
        patient.heart_rate = vitals_in.heart_rate
        patient.sbp = vitals_in.sbp
        patient.dbp = vitals_in.dbp
        patient.spo2 = vitals_in.spo2
        patient.respiratory_rate = vitals_in.respiratory_rate
        patient.temperature_c = vitals_in.temperature_c
        patient.gcs = vitals_in.gcs
        patient.predicted_triage_level = new_triage_level
        patient.triage_level_name = LEVEL_NAMES.get(new_triage_level, "Urgent")
        patient.risk_score = new_risk_score
        patient.is_high_risk = new_is_high_risk
        patient.confidence = new_conf
        patient.last_reassessment_timestamp = datetime.utcnow()
        patient.monitoring_status = "DETERIORATING" if is_deteriorating else ("CLINICIAN REVIEW" if clinician_review_needed else "STABLE")

        # Update vitals history list
        hist = []
        if patient.vitals_history:
            try:
                hist = json.loads(patient.vitals_history) if isinstance(patient.vitals_history, str) else patient.vitals_history
            except Exception:
                hist = []
        hist.append({
            "timestamp": datetime.utcnow().isoformat(),
            **curr_vitals
        })
        patient.vitals_history = json.dumps(hist)

        # 5. Persist Reassessment Record
        wait_mins = max(0, int((datetime.utcnow() - patient.arrival_timestamp).total_seconds() / 60.0))
        reassessment_obj = PatientReassessment(
            patient_id=patient.patient_id,
            timestamp=datetime.utcnow(),
            previous_triage_level=prev_level,
            current_triage_level=new_triage_level,
            previous_risk_score=prev_risk,
            current_risk_score=new_risk_score,
            previous_vitals=prev_vitals,
            current_vitals=curr_vitals,
            deterioration_detected=is_deteriorating,
            deterioration_factors=det_reasons,
            reason_for_reassessment=reason_str,
            waiting_time_at_reassessment=wait_mins,
            confidence=new_conf,
            clinician_review_required=clinician_review_needed,
            clinician_override=False,
            notes=vitals_in.notes
        )
        db.add(reassessment_obj)

        # 6. Generate Audit Log Entries
        db.add(AuditLog(
            event_type="VITALS_UPDATED",
            patient_id=patient.patient_id,
            actor=vitals_in.actor or "Triage Clinician",
            previous_state=prev_vitals,
            new_state=curr_vitals,
            reason="Recorded updated vital signs observation",
            timestamp=datetime.utcnow()
        ))

        if is_deteriorating:
            db.add(AuditLog(
                event_type="DETERIORATION_DETECTED",
                patient_id=patient.patient_id,
                actor="Reassessment Engine",
                previous_state={"triage_level": prev_level, "risk_score": prev_risk},
                new_state={"triage_level": new_triage_level, "risk_score": new_risk_score},
                reason="; ".join(det_reasons),
                timestamp=datetime.utcnow()
            ))

        if prev_level != new_triage_level:
            db.add(AuditLog(
                event_type="TRIAGE_RECOMMENDATION_CHANGED",
                patient_id=patient.patient_id,
                actor="Reassessment Engine",
                previous_state={"triage_level": prev_level, "risk_score": prev_risk},
                new_state={"triage_level": new_triage_level, "risk_score": new_risk_score},
                reason=reason_str,
                timestamp=datetime.utcnow()
            ))

        db.commit()
        db.refresh(reassessment_obj)

        return ReassessmentItem(
            id=reassessment_obj.id,
            patient_id=reassessment_obj.patient_id,
            timestamp=reassessment_obj.timestamp,
            previous_triage_level=reassessment_obj.previous_triage_level,
            current_triage_level=reassessment_obj.current_triage_level,
            previous_risk_score=reassessment_obj.previous_risk_score,
            current_risk_score=reassessment_obj.current_risk_score,
            previous_vitals=reassessment_obj.previous_vitals,
            current_vitals=reassessment_obj.current_vitals,
            deterioration_detected=reassessment_obj.deterioration_detected,
            deterioration_factors=reassessment_obj.deterioration_factors or [],
            reason_for_reassessment=reassessment_obj.reason_for_reassessment,
            waiting_time_at_reassessment=reassessment_obj.waiting_time_at_reassessment,
            confidence=reassessment_obj.confidence,
            clinician_review_required=reassessment_obj.clinician_review_required,
            clinician_override=reassessment_obj.clinician_override,
            override_level=reassessment_obj.override_level,
            override_reason=reassessment_obj.override_reason,
            notes=reassessment_obj.notes
        )

    @staticmethod
    def record_clinician_override(
        db: Session,
        patient_id: str,
        override_in: ClinicianOverrideRequest
    ) -> ReassessmentItem:
        """
        Record a clinician override for a patient's triage recommendation.
        Maintains immutable model estimate while updating effective decision level.
        """
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient with ID '{patient_id}' not found")

        prev_level = patient.clinician_override_level or patient.predicted_triage_level or 3
        new_level = override_in.override_level

        patient.clinician_override_level = new_level
        patient.clinician_override_reason = override_in.override_reason
        patient.monitoring_status = "STABLE"

        curr_vitals = {
            "heart_rate": patient.heart_rate,
            "sbp": patient.sbp,
            "dbp": patient.dbp,
            "spo2": patient.spo2,
            "respiratory_rate": patient.respiratory_rate,
            "temperature_c": patient.temperature_c,
            "gcs": patient.gcs
        }

        wait_mins = max(0, int((datetime.utcnow() - patient.arrival_timestamp).total_seconds() / 60.0))
        reassessment_obj = PatientReassessment(
            patient_id=patient.patient_id,
            timestamp=datetime.utcnow(),
            previous_triage_level=prev_level,
            current_triage_level=new_level,
            previous_risk_score=patient.risk_score or 50.0,
            current_risk_score=patient.risk_score or 50.0,
            previous_vitals=curr_vitals,
            current_vitals=curr_vitals,
            deterioration_detected=False,
            deterioration_factors=[],
            reason_for_reassessment=f"Clinician Override: {override_in.override_reason}",
            waiting_time_at_reassessment=wait_mins,
            confidence=1.0,  # Clinician authoritative override
            clinician_review_required=False,
            clinician_override=True,
            override_level=new_level,
            override_reason=override_in.override_reason,
            notes=override_in.notes
        )
        db.add(reassessment_obj)

        db.add(AuditLog(
            event_type="CLINICIAN_OVERRIDE",
            patient_id=patient.patient_id,
            actor=override_in.clinician_name or "Attending Clinician",
            previous_state={"effective_level": prev_level, "ai_predicted_level": patient.predicted_triage_level},
            new_state={"effective_level": new_level, "override_reason": override_in.override_reason},
            reason=override_in.override_reason,
            timestamp=datetime.utcnow()
        ))

        db.commit()
        db.refresh(reassessment_obj)

        return ReassessmentItem(
            id=reassessment_obj.id,
            patient_id=reassessment_obj.patient_id,
            timestamp=reassessment_obj.timestamp,
            previous_triage_level=reassessment_obj.previous_triage_level,
            current_triage_level=reassessment_obj.current_triage_level,
            previous_risk_score=reassessment_obj.previous_risk_score,
            current_risk_score=reassessment_obj.current_risk_score,
            previous_vitals=reassessment_obj.previous_vitals,
            current_vitals=reassessment_obj.current_vitals,
            deterioration_detected=reassessment_obj.deterioration_detected,
            deterioration_factors=[],
            reason_for_reassessment=reassessment_obj.reason_for_reassessment,
            waiting_time_at_reassessment=reassessment_obj.waiting_time_at_reassessment,
            confidence=reassessment_obj.confidence,
            clinician_review_required=reassessment_obj.clinician_review_required,
            clinician_override=reassessment_obj.clinician_override,
            override_level=reassessment_obj.override_level,
            override_reason=reassessment_obj.override_reason,
            notes=reassessment_obj.notes
        )

    @staticmethod
    def get_patient_history(db: Session, patient_id: str) -> ReassessmentHistoryResponse:
        """Retrieve full chronological reassessment history for a patient."""
        records = db.query(PatientReassessment).filter(
            PatientReassessment.patient_id == patient_id
        ).order_by(PatientReassessment.timestamp.asc()).all()

        items = [
            ReassessmentItem(
                id=r.id,
                patient_id=r.patient_id,
                timestamp=r.timestamp,
                previous_triage_level=r.previous_triage_level,
                current_triage_level=r.current_triage_level,
                previous_risk_score=r.previous_risk_score,
                current_risk_score=r.current_risk_score,
                previous_vitals=r.previous_vitals,
                current_vitals=r.current_vitals,
                deterioration_detected=r.deterioration_detected,
                deterioration_factors=r.deterioration_factors or [],
                reason_for_reassessment=r.reason_for_reassessment,
                waiting_time_at_reassessment=r.waiting_time_at_reassessment,
                confidence=r.confidence,
                clinician_review_required=r.clinician_review_required,
                clinician_override=r.clinician_override,
                override_level=r.override_level,
                override_reason=r.override_reason,
                notes=r.notes
            )
            for r in records
        ]

        return ReassessmentHistoryResponse(
            patient_id=patient_id,
            total_reassessments=len(items),
            timeline=items
        )

    @staticmethod
    def get_active_reassessment_alerts(db: Session) -> AlertsListResponse:
        """Scan active queue for deterioration and waiting-time reassessment triggers."""
        patients = db.query(Patient).filter(Patient.status.in_(["waiting", "triaged"])).all()
        alerts: List[ReassessmentAlert] = []

        cap = hospital_service.get_capacity_state()
        surge_status = cap.get("surge_status", "normal")

        seen_patients = set()
        for p in patients:
            if p.patient_id in seen_patients:
                continue

            status_info = ReassessmentService.get_patient_monitoring_status(db, p)
            if status_info.is_deteriorating:
                seen_patients.add(p.patient_id)
                alerts.append(
                    ReassessmentAlert(
                        alert_id=f"ALT-DET-{p.patient_id}",
                        patient_id=p.patient_id,
                        patient_name=p.full_name,
                        severity="critical",
                        alert_type="DETERIORATION",
                        message=f"Clinical deterioration detected: {'; '.join(status_info.deterioration_reasons[:2])}",
                        deterioration_factors=status_info.deterioration_reasons,
                        previous_level=p.predicted_triage_level or 3,
                        current_level=status_info.effective_triage_level,
                        risk_score=p.risk_score or 50.0,
                        timestamp=datetime.utcnow()
                    )
                )
            elif status_info.is_reassessment_due:
                seen_patients.add(p.patient_id)
                alerts.append(
                    ReassessmentAlert(
                        alert_id=f"ALT-DUE-{p.patient_id}",
                        patient_id=p.patient_id,
                        patient_name=p.full_name,
                        severity="warning",
                        alert_type="REASSESSMENT_DUE",
                        message=f"Waiting threshold exceeded ({status_info.minutes_since_last_assessment}m since last assessment, limit: {status_info.reassessment_interval_minutes}m)",
                        deterioration_factors=[],
                        previous_level=status_info.effective_triage_level,
                        current_level=status_info.effective_triage_level,
                        risk_score=p.risk_score or 50.0,
                        timestamp=datetime.utcnow()
                    )
                )

        return AlertsListResponse(
            alerts=alerts,
            total_alerts=len(alerts)
        )

    @staticmethod
    def list_audit_logs(
        db: Session,
        patient_id: Optional[str] = None,
        event_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> AuditListResponse:
        """Fetch audit log entries with optional patient_id and event_type filtering."""
        query = db.query(AuditLog)
        if patient_id:
            query = query.filter(AuditLog.patient_id == patient_id)
        if event_type:
            query = query.filter(AuditLog.event_type == event_type)

        total = query.count()
        logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

        log_items = [
            AuditLogResponse(
                id=l.id,
                event_type=l.event_type,
                patient_id=l.patient_id,
                actor=l.actor,
                previous_state=l.previous_state,
                new_state=l.new_state,
                reason=l.reason,
                timestamp=l.timestamp
            )
            for l in logs
        ]

        return AuditListResponse(
            total=total,
            logs=log_items
        )


reassessment_service = ReassessmentService()

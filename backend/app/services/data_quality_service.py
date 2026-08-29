"""
PatientTriage.ai — Data Quality & Clinical Uncertainty Inspector

Audits patient record completeness and physiological coherence before AI triage:
- Identifies missing physiological vitals
- Identifies zero-history / first-time patient presentations
- Detects absent, vague, or out-of-vocabulary symptom descriptions
- Detects conflicting clinical signals (e.g. severe hypoxemia without respiratory rate response)
- Checks unsupported/unseen categories
- Evaluates if data quality is Complete vs Limited
- Flags 'Needs Clinician Review' under informational ambiguity or unseen presentation

Never fabricates missing data.
"""

from typing import Dict, Any, List, Tuple
from model.features import inspect_patient_inputs, safe_float


class DataQualityService:
    @staticmethod
    def evaluate_data_quality(patient_record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inspect patient record and return structured quality assessment.
        """
        issues: List[str] = []
        is_limited = False
        needs_review = False
        review_reasons: List[str] = []

        # 1. Inspect input categories (KNOWN, UNSEEN, MISSING)
        input_audit = inspect_patient_inputs(patient_record)
        input_classification = input_audit["input_classification"]
        is_unseen = input_audit["is_unseen_input"]
        missing_fields = input_audit["missing_fields"]

        # 2. Missing / Incomplete Vital Signs
        vital_labels = {
            "heart_rate": "Heart Rate",
            "sbp": "Systolic BP",
            "dbp": "Diastolic BP",
            "spo2": "Oxygen Saturation (SpO2)",
            "respiratory_rate": "Respiratory Rate",
            "gcs": "Glasgow Coma Scale (GCS)"
        }

        for vk in missing_fields:
            label = vital_labels.get(vk, vk.replace("_", " ").title())
            issues.append(f"Missing vital sign: {label}")
            is_limited = True
            needs_review = True
            review_reasons.append(f"Missing baseline {label}")

        # 3. Medical History Quality (Zero-History / First-Time Patient)
        history_val = str(patient_record.get("medical_history") or "").strip().lower()
        if not history_val or history_val in ["none", "no history", "first time", "unknown", "n/a", "nil", "none known"]:
            issues.append("First-time presentation: Zero documented prior hospital medical history")
            is_limited = True
            review_reasons.append("Zero documented baseline history")

        # 4. Chief Complaint & Symptoms Completeness & OOV Detection
        complaint = str(patient_record.get("chief_complaint") or "").strip()
        symptoms = str(patient_record.get("symptoms") or "").strip()

        if len(complaint) < 3:
            issues.append("Vague or very brief chief complaint stated")
            is_limited = True
            needs_review = True
            review_reasons.append("Chief complaint is brief/underspecified")

        if not symptoms or symptoms.lower() in ["none", "none stated", "n/a"]:
            issues.append("No specific symptom chips recorded")
            is_limited = True

        if is_unseen:
            issues.append(f"Unseen / out-of-vocabulary clinical presentation: '{complaint[:40]}'")
            needs_review = True
            review_reasons.append(f"Unclassified clinical complaint ('{complaint[:30]}')")

        # 5. Conflicting Signal Detection
        hr = safe_float(patient_record.get("heart_rate"))
        sbp = safe_float(patient_record.get("sbp"))
        dbp = safe_float(patient_record.get("dbp"))
        spo2 = safe_float(patient_record.get("spo2"))
        rr = safe_float(patient_record.get("respiratory_rate"))

        # Conflicting hypoxemia vs normal respiratory rate
        if 0 < spo2 < 88 and 0 < rr < 14:
            issues.append("Conflicting signal: Severe hypoxemia (SpO2 < 88%) without expected compensatory tachypnea (RR < 14/min)")
            is_limited = True
            needs_review = True
            review_reasons.append("Severe hypoxemia without compensatory tachypnea")

        # Conflicting SBP vs DBP
        if sbp > 0 and dbp > 0:
            if dbp >= sbp:
                issues.append("Conflicting hemodynamic signal: Diastolic BP exceeds or equals Systolic BP")
                is_limited = True
                needs_review = True
                review_reasons.append("Physiologically invalid BP (DBP >= SBP)")
            elif (sbp - dbp) < 15:
                issues.append("Narrow pulse pressure warning (< 15 mmHg): Possible cardiogenic shock or measurement error")
                is_limited = True
                needs_review = True
                review_reasons.append("Critically narrow pulse pressure (<15 mmHg)")

        # Extreme bradycardia with high SBP (Cushing's triad or artifact)
        if 0 < hr < 42 and sbp > 190:
            issues.append("High-acuity alert / Conflicting signal: Severe bradycardia with extreme hypertension (Potential Cushing's reflex)")
            needs_review = True
            review_reasons.append("Severe bradycardia with malignant hypertension")

        # 6. Unsupported / Unseen Category Flag
        arrival_mode = str(patient_record.get("arrival_mode") or "").strip()
        standard_modes = [
            "Walk-in", "Ambulance (EMS)", "Private Vehicle",
            "Helicopter (Air Ambulance)", "Police / Corrections", "Public Transit"
        ]
        if arrival_mode and arrival_mode not in standard_modes:
            issues.append(f"Unrecognized arrival mode category: '{arrival_mode}'")

        data_quality = "Limited" if is_limited else "Complete"
        review_reason_str = "; ".join(review_reasons) if review_reasons else None

        return {
            "data_quality": data_quality,
            "data_quality_issues": issues,
            "needs_clinician_review": needs_review or (data_quality == "Limited"),
            "review_reason": review_reason_str,
            "input_classification": input_classification,
            "is_unseen_input": is_unseen,
            "missing_fields": missing_fields
        }


data_quality_service = DataQualityService()

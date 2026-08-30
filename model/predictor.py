"""
PatientTriage.ai — Interpretable Priority / Risk Predictor & Explainability Engine

Loads trained Logistic Regression triage model artifacts and produces:
1. Predicted Triage Acuity Level (ESI 1 to 5) with calibrated 5-level distribution
2. Continuous Priority / Risk Score (0 to 100)
3. High-Risk Alert Flag (Boolean)
4. Model Confidence Score (0.0 to 1.0) with Uncertainty Penalty on missing/unseen input
5. Local Feature Contributions & Clinician-Friendly Explanations
6. Input Classification (KNOWN, UNKNOWN/UNSEEN, MISSING) and Safety Guardrails
"""

import os
from pathlib import Path
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
import model._bootstrap  # noqa: F401
import joblib

from model.features import (
    extract_features_from_record,
    inspect_patient_inputs,
    safe_float,
    FEATURE_COLUMNS,
    NUMERICAL_COLS
)

DEFAULT_ARTIFACT_PATH = str(Path(__file__).resolve().parent / "artifacts" / "triage_model.joblib")

ESI_NAMES = {
    1: "Level 1 — Resuscitation",
    2: "Level 2 — Emergent",
    3: "Level 3 — Urgent",
    4: "Level 4 — Less Urgent",
    5: "Level 5 — Non-Urgent"
}

# Clinical severity weights for computing continuous 0-100 risk score from class probabilities
SEVERITY_WEIGHTS = {
    1: 98.0,
    2: 80.0,
    3: 50.0,
    4: 25.0,
    5: 8.0
}


def find_model_artifact(custom_path: Optional[str] = None) -> Path:
    """
    Locate the triage model artifact across deployment environments:
    1. Explicit custom_path if passed (must exist)
    2. PATIENT_TRIAGE_MODEL_PATH environment variable (if set and exists)
    3. Package-relative path (model/artifacts/triage_model.joblib)
    4. Working directory relative paths
    """
    if custom_path:
        p = Path(custom_path)
        if not p.is_file():
            raise FileNotFoundError(
                f"Critical ML Deployment Error: Specified model artifact '{custom_path}' not found on filesystem."
            )
        return p.resolve()

    candidates = []
    if os.environ.get("PATIENT_TRIAGE_MODEL_PATH"):
        candidates.append(Path(os.environ["PATIENT_TRIAGE_MODEL_PATH"]))

    # Primary deployment path: relative to predictor.py file location
    primary_path = Path(__file__).resolve().parent / "artifacts" / "triage_model.joblib"
    candidates.append(primary_path)

    # Working directory fallbacks
    candidates.append(Path.cwd() / "model" / "artifacts" / "triage_model.joblib")
    candidates.append(Path.cwd() / "artifacts" / "triage_model.joblib")

    for p in candidates:
        if p.exists() and p.is_file():
            return p.resolve()

    checked_str = "\n  - ".join(str(c) for c in candidates)
    raise FileNotFoundError(
        f"Critical ML Deployment Error: Required model artifact 'triage_model.joblib' was not found.\n"
        f"Attempted candidate search paths:\n  - {checked_str}\n"
        f"Remediation: Ensure 'model/artifacts/triage_model.joblib' is tracked and present, "
        f"or set the 'PATIENT_TRIAGE_MODEL_PATH' environment variable."
    )


class TriagePredictor:
    """
    Inference and Explainability engine for PatientTriage.ai.
    """
    def __init__(self, artifact_path: Optional[str] = None):
        self.artifact_path = find_model_artifact(artifact_path)

        try:
            artifact = joblib.load(self.artifact_path)
        except Exception as e:
            raise RuntimeError(
                f"Failed to deserialize ML model artifact from '{self.artifact_path}': {e}"
            ) from e

        if "model" not in artifact or "feature_pipeline" not in artifact:
            raise ValueError(
                f"Corrupted model artifact at '{self.artifact_path}'. Expected dictionary keys 'model' and 'feature_pipeline'."
            )

        self.model = artifact["model"]
        self.pipeline = artifact["feature_pipeline"]
        self.feature_names = artifact.get("feature_names", FEATURE_COLUMNS)
        self.classes = artifact.get("classes", np.array([1, 2, 3, 4, 5]))
        self.metadata = artifact.get("metadata", {})

    def _format_factor_explanation(
        self, feat_name: str, raw_val: float, raw_record: Dict[str, Any], contrib: float
    ) -> Optional[Dict[str, Any]]:
        """Convert a feature contribution into a clinician-readable explanation card."""
        if feat_name == "spo2":
            if raw_val < 92:
                return {
                    "factor": "Oxygen Saturation (SpO2)",
                    "detail": f"{int(raw_val)}% on Room Air (Hypoxemia)",
                    "contribution": round(contrib, 3),
                    "severity_impact": "critical" if raw_val < 90 else "high"
                }
            elif raw_val >= 98:
                return {
                    "factor": "Normal Oxygenation",
                    "detail": f"{int(raw_val)}% on Room Air",
                    "contribution": round(contrib, 3),
                    "severity_impact": "low"
                }
        elif feat_name == "heart_rate":
            if raw_val > 100 or raw_val < 60:
                return {
                    "factor": "Heart Rate Deviation",
                    "detail": f"{int(raw_val)} bpm ({'Tachycardia' if raw_val > 100 else 'Bradycardia'})",
                    "contribution": round(contrib, 3),
                    "severity_impact": "critical" if raw_val > 135 or raw_val < 45 else "moderate"
                }
        elif feat_name in ["sbp", "mean_arterial_pressure"]:
            sbp_val = int(safe_float(raw_record.get("sbp"), raw_val))
            dbp_val = int(safe_float(raw_record.get("dbp"), 80))
            if sbp_val < 95 or sbp_val > 175:
                return {
                    "factor": "Blood Pressure Hemodynamics",
                    "detail": f"{sbp_val}/{dbp_val} mmHg",
                    "contribution": round(contrib, 3),
                    "severity_impact": "critical" if sbp_val < 85 or sbp_val > 200 else "high"
                }
        elif feat_name == "gcs":
            if raw_val < 15:
                return {
                    "factor": "Altered Mental Status (GCS)",
                    "detail": f"GCS {int(raw_val)}/15",
                    "contribution": round(contrib, 3),
                    "severity_impact": "critical" if raw_val <= 8 else "high"
                }
        elif feat_name == "respiratory_rate":
            if raw_val > 22 or raw_val < 10:
                return {
                    "factor": "Respiratory Rate Deviation",
                    "detail": f"{int(raw_val)} breaths/min ({'Tachypnea' if raw_val > 22 else 'Bradypnea'})",
                    "contribution": round(contrib, 3),
                    "severity_impact": "high" if raw_val > 30 else "moderate"
                }
        elif feat_name == "temperature_c":
            if raw_val >= 38.3:
                return {
                    "factor": "Fever / Hyperthermia",
                    "detail": f"{raw_val:.1f} °C",
                    "contribution": round(contrib, 3),
                    "severity_impact": "high" if raw_val >= 39.5 else "moderate"
                }
            elif raw_val <= 35.5:
                return {
                    "factor": "Hypothermia",
                    "detail": f"{raw_val:.1f} °C",
                    "contribution": round(contrib, 3),
                    "severity_impact": "high"
                }
        elif feat_name == "flag_chest_pain" and raw_val > 0.5:
            return {
                "factor": "Cardiac Presentation",
                "detail": "Chest pain / Substernal pressure reported",
                "contribution": round(contrib, 3),
                "severity_impact": "high"
            }
        elif feat_name == "flag_respiratory_distress" and raw_val > 0.5:
            return {
                "factor": "Respiratory Distress Symptoms",
                "detail": "Dyspnea / Wheezing / Airway distress reported",
                "contribution": round(contrib, 3),
                "severity_impact": "high"
            }
        elif feat_name == "flag_stroke_neuro" and raw_val > 0.5:
            return {
                "factor": "Neurological Deficit / Stroke Presentation",
                "detail": "Focal weakness / Dysarthria / Syncope reported",
                "contribution": round(contrib, 3),
                "severity_impact": "critical"
            }
        elif feat_name == "flag_severe_trauma" and raw_val > 0.5:
            return {
                "factor": "Trauma Mechanism",
                "detail": "High energy impact / Fracture / Laceration",
                "contribution": round(contrib, 3),
                "severity_impact": "high"
            }
        elif feat_name == "flag_sepsis_fever" and raw_val > 0.5:
            return {
                "factor": "Suspected Sepsis Signs",
                "detail": "Systemic infection with fever / chills",
                "contribution": round(contrib, 3),
                "severity_impact": "high"
            }
        elif feat_name == "obs_pale_diaphoretic" and raw_val > 0.5:
            return {
                "factor": "Clinician Observation: Diaphoresis",
                "detail": "Patient observed pale, clammy, and diaphoretic",
                "contribution": round(contrib, 3),
                "severity_impact": "high"
            }
        elif feat_name == "obs_cyanotic" and raw_val > 0.5:
            return {
                "factor": "Clinician Observation: Cyanosis",
                "detail": "Peripheral/central cyanosis noted",
                "contribution": round(contrib, 3),
                "severity_impact": "critical"
            }
        elif feat_name == "obs_unresponsive_or_lethargic" and raw_val > 0.5:
            return {
                "factor": "Clinician Observation: Lethargy",
                "detail": "Decreased level of consciousness/responsiveness",
                "contribution": round(contrib, 3),
                "severity_impact": "critical"
            }
        elif feat_name == "is_ambulance_or_air" and raw_val > 0.5:
            return {
                "factor": "Arrival Mode",
                "detail": "Emergency EMS / Air Ambulance arrival",
                "contribution": round(contrib, 3),
                "severity_impact": "moderate"
            }

        return None

    def predict(
        self,
        patient_data: Dict[str, Any],
        hospital_capacity: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Run robust inference on a patient record with optional hospital capacity context.
        Guarantees zero exceptions on any unseen, malformed, or missing input.
        """
        # 1. Inspect input quality & classify known vs unseen vs missing
        input_audit = inspect_patient_inputs(patient_data)
        input_classification = input_audit["input_classification"]
        is_unseen = input_audit["is_unseen_input"]
        missing_fields = input_audit["missing_fields"]

        # Contextual capacity
        wr_ratio = 0.50
        if hospital_capacity:
            wr_info = hospital_capacity.get("waiting_room", {})
            cap = wr_info.get("capacity", 45)
            occ = wr_info.get("current_occupancy", 20)
            wr_ratio = float(occ) / float(max(1, cap))

        # 2. Extract raw feature dictionary safely
        feat_dict = extract_features_from_record(patient_data, waiting_room_ratio=wr_ratio)
        df_single = pd.DataFrame([feat_dict])[self.feature_names]

        # 3. Scale features with persisted scaler
        X_scaled = self.pipeline.transform(df_single)

        # 4. Model Probabilities & Raw Class
        probs = self.model.predict_proba(X_scaled)[0]  # Probabilities for classes [1, 2, 3, 4, 5]
        class_idx = int(np.argmax(probs))
        raw_predicted_level = int(self.classes[class_idx])
        base_confidence = float(probs[class_idx])

        # 5. Continuous Normalized Priority / Risk Score [0.0, 100.0]
        risk_score = 0.0
        for c, p in zip(self.classes, probs):
            risk_score += SEVERITY_WEIGHTS[c] * p
        risk_score = float(np.clip(round(risk_score, 1), 0.0, 100.0))

        # 6. Physiological Safety Net & 5-Level Calibration
        hr = feat_dict["heart_rate"]
        sbp = feat_dict["sbp"]
        spo2 = feat_dict["spo2"]
        rr = feat_dict["respiratory_rate"]
        gcs = feat_dict["gcs"]
        temp_c = feat_dict["temperature_c"]

        # Critical Resuscitation Triggers (Level 1)
        is_crit_level_1 = (
            gcs <= 8.0 or
            spo2 < 85.0 or
            sbp < 70.0 or
            hr > 160.0 or
            hr < 35.0 or
            feat_dict["obs_cyanotic"] > 0.5 or
            (feat_dict["obs_unresponsive_or_lethargic"] > 0.5 and gcs <= 10.0)
        )

        # Emergent Triggers (Level 2)
        is_emergent_level_2 = (
            (spo2 < 91.0 and feat_dict["flag_respiratory_distress"] > 0.5) or
            (sbp < 90.0 and feat_dict["flag_chest_pain"] > 0.5) or
            (gcs <= 13.0) or
            (hr > 130.0 and temp_c >= 38.5 and feat_dict["flag_sepsis_fever"] > 0.5) or
            (feat_dict["flag_stroke_neuro"] > 0.5 and (feat_dict["obs_confused"] > 0.5 or gcs < 15)) or
            (feat_dict["flag_severe_trauma"] > 0.5 and sbp < 95.0)
        )

        # Calibrate final triage level: never silently downgrade if critical physiology is present
        if is_crit_level_1:
            predicted_level = 1
            risk_score = max(risk_score, 92.0)
        elif is_emergent_level_2:
            predicted_level = min(raw_predicted_level, 2)
            risk_score = max(risk_score, 75.0)
        else:
            predicted_level = raw_predicted_level

        # High Risk Alert Flag
        prob_high_acuity = float(probs[self.classes.index(1)] + probs[self.classes.index(2)])
        is_high_risk = bool(
            predicted_level in [1, 2] or
            prob_high_acuity >= 0.40 or
            risk_score >= 65.0 or
            spo2 < 90.0 or
            gcs <= 13.0 or
            sbp < 90.0 or
            hr > 130.0
        )

        # 7. Uncertainty Quantification & Safety Penalties
        uncertainty_reasons: List[str] = []
        confidence_penalty = 0.0

        if is_unseen:
            confidence_penalty += 0.15
            complaint_text = str(patient_data.get("chief_complaint") or "")
            uncertainty_reasons.append(
                f"Unseen/unclassified presentation ('{complaint_text[:40]}...') — evaluated via physiological vitals."
            )

        if len(missing_fields) > 0:
            confidence_penalty += min(0.30, len(missing_fields) * 0.08)
            missing_labels = [f.replace("_", " ").title() for f in missing_fields]
            uncertainty_reasons.append(
                f"Missing vital sign parameters: {', '.join(missing_labels)} (standard baseline imputed)."
            )

        final_confidence = float(np.clip(round(base_confidence - confidence_penalty, 4), 0.35, 0.99))
        uncertainty_reason_str = " | ".join(uncertainty_reasons) if uncertainty_reasons else None
        needs_clinician_review = bool(is_unseen or len(missing_fields) > 0 or is_high_risk or final_confidence < 0.65)

        # 8. Local Explainability Calculation (Logit Contributions)
        coefficients = self.model.coef_[class_idx]
        z_scores = X_scaled[0]
        logit_contributions = z_scores * coefficients
        ranked_indices = np.argsort(-logit_contributions)

        top_factors = []
        raw_contributions = {}
        for idx in ranked_indices:
            fname = self.feature_names[idx]
            c_val = float(logit_contributions[idx])
            r_val = float(feat_dict[fname])
            raw_contributions[fname] = round(c_val, 4)

            if len(top_factors) < 4:
                formatted = self._format_factor_explanation(fname, r_val, patient_data, c_val)
                if formatted and formatted not in top_factors:
                    top_factors.append(formatted)

        # Include unseen symptom annotation if present
        if is_unseen:
            top_factors.insert(0, {
                "factor": "Out-of-Vocabulary Clinical Presentation",
                "detail": f"Unseen complaint '{str(patient_data.get('chief_complaint') or '')[:35]}' assessed via hemodynamics",
                "contribution": 0.25,
                "severity_impact": "moderate"
            })

        # Fallback explanation
        if not top_factors:
            top_factors.append({
                "factor": "Baseline Clinical Presentation",
                "detail": f"Vital parameters consistent with {ESI_NAMES[predicted_level]}",
                "contribution": 0.5,
                "severity_impact": "low"
            })

        return {
            "patient_id": patient_data.get("patient_id", "P-UNKNOWN"),
            "predicted_triage_level": predicted_level,
            "triage_level_name": ESI_NAMES[predicted_level],
            "risk_score": risk_score,
            "is_high_risk": is_high_risk,
            "confidence": final_confidence,
            "uncertainty_reason": uncertainty_reason_str,
            "needs_clinician_review": needs_clinician_review,
            "input_classification": input_classification,
            "is_unseen_input": is_unseen,
            "missing_fields": missing_fields,
            "class_probabilities": {
                f"Level_{c}": round(float(p), 4) for c, p in zip(self.classes, probs)
            },
            "top_factors": top_factors[:4],
            "raw_contributions": raw_contributions,
            "prototype_disclaimer": "Generated from synthetic prototype data for development and architecture demonstration. NOT clinically certified."
        }

"""
PatientTriage.ai — Interpretable Priority / Risk Predictor & Explainability Engine

Loads trained Logistic Regression triage model artifacts and produces:
1. Predicted Triage Acuity Level (ESI 1 to 5)
2. Continuous Priority / Risk Score (0 to 100)
3. High-Risk Alert Flag (Boolean)
4. Model Confidence Score (0.0 to 1.0)
5. Local Feature Contributions & Clinician-Friendly Explanations
"""

import os
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd
import model._bootstrap  # noqa: F401
import joblib

from model.features import extract_features_from_record, FEATURE_COLUMNS, NUMERICAL_COLS


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
    2: 82.0,
    3: 52.0,
    4: 24.0,
    5: 8.0
}


class TriagePredictor:
    """
    Inference and Explainability engine for PatientTriage.ai.
    """
    def __init__(self, artifact_path: str = "model/artifacts/triage_model.joblib"):
        if not os.path.exists(artifact_path):
            raise FileNotFoundError(f"Model artifact not found at: {artifact_path}. Run model/train.py first.")

        artifact = joblib.load(artifact_path)
        self.model = artifact["model"]
        self.pipeline = artifact["feature_pipeline"]
        self.feature_names = artifact["feature_names"]
        self.classes = artifact["classes"]
        self.metadata = artifact.get("metadata", {})

    def _format_factor_explanation(self, feat_name: str, raw_val: float, raw_record: Dict[str, Any], contrib: float) -> Optional[Dict[str, Any]]:
        """Convert a feature contribution into a clinician-readable explanation card."""
        direction = "increases_acuity" if contrib > 0 else "decreases_acuity"
        
        if feat_name == "spo2":
            return {
                "factor": "Oxygen Saturation (SpO2)",
                "detail": f"{int(raw_val)}% on Room Air",
                "contribution": round(contrib, 3),
                "severity_impact": "critical" if raw_val < 90 else "moderate"
            }
        elif feat_name == "heart_rate":
            if raw_val > 100 or raw_val < 60:
                return {
                    "factor": "Heart Rate Abnormality",
                    "detail": f"{int(raw_val)} bpm",
                    "contribution": round(contrib, 3),
                    "severity_impact": "high" if raw_val > 120 or raw_val < 50 else "moderate"
                }
        elif feat_name == "sbp" or feat_name == "mean_arterial_pressure":
            sbp_val = int(raw_record.get("sbp", raw_val))
            dbp_val = int(raw_record.get("dbp", 80))
            if sbp_val < 95 or sbp_val > 180:
                return {
                    "factor": "Blood Pressure Hemodynamics",
                    "detail": f"{sbp_val}/{dbp_val} mmHg",
                    "contribution": round(contrib, 3),
                    "severity_impact": "high" if sbp_val < 90 or sbp_val > 200 else "moderate"
                }
        elif feat_name == "gcs":
            if raw_val < 15:
                return {
                    "factor": "Altered Mental Status (GCS)",
                    "detail": f"GCS {int(raw_val)}/15",
                    "contribution": round(contrib, 3),
                    "severity_impact": "critical" if raw_val < 9 else "high"
                }
        elif feat_name == "respiratory_rate":
            if raw_val > 22 or raw_val < 10:
                return {
                    "factor": "Respiratory Rate Deviation",
                    "detail": f"{int(raw_val)} breaths/min",
                    "contribution": round(contrib, 3),
                    "severity_impact": "moderate"
                }
        elif feat_name == "temperature_c":
            if raw_val >= 38.3:
                return {
                    "factor": "Fever / Hyperthermia",
                    "detail": f"{raw_val:.1f} °C",
                    "contribution": round(contrib, 3),
                    "severity_impact": "moderate"
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
                "factor": "Cardiac Symptom Presentation",
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
                "factor": "Clinician Observation: Unresponsive / Lethargic",
                "detail": "Decreased level of responsiveness",
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
        elif feat_name == "waiting_room_occupancy_ratio" and raw_val >= 0.80:
            return {
                "factor": "Hospital Congestion Factor",
                "detail": f"Waiting room at {int(raw_val*100)}% capacity",
                "contribution": round(contrib, 3),
                "severity_impact": "contextual"
            }

        return None

    def predict(self, patient_data: Dict[str, Any], hospital_capacity: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Run inference on a single patient record with optional hospital capacity context.
        """
        # Contextual capacity
        wr_ratio = 0.50
        if hospital_capacity:
            wr_info = hospital_capacity.get("waiting_room", {})
            cap = wr_info.get("capacity", 45)
            occ = wr_info.get("current_occupancy", 20)
            wr_ratio = float(occ) / float(max(1, cap))

        # 1. Extract raw feature dictionary
        feat_dict = extract_features_from_record(patient_data, waiting_room_ratio=wr_ratio)
        df_single = pd.DataFrame([feat_dict])[self.feature_names]

        # 2. Scale features with persisted scaler
        X_scaled = self.pipeline.transform(df_single)  # Shape (1, num_features)

        # 3. Model Inference
        probs = self.model.predict_proba(X_scaled)[0]  # Array of probabilities for classes [1, 2, 3, 4, 5]
        class_idx = int(np.argmax(probs))
        predicted_level = int(self.classes[class_idx])
        confidence = float(probs[class_idx])

        # 4. Continuous Normalized Priority / Risk Score [0.0, 100.0]
        risk_score = 0.0
        for c, p in zip(self.classes, probs):
            risk_score += SEVERITY_WEIGHTS[c] * p
        risk_score = float(np.clip(round(risk_score, 1), 0.0, 100.0))

        # 5. High-Risk Flag (Dual Model Probability + Physiological Safety Net)
        prob_high_acuity = float(probs[self.classes.index(1)] + probs[self.classes.index(2)])
        is_high_risk = bool(
            predicted_level in [1, 2] or
            prob_high_acuity >= 0.40 or
            risk_score >= 65.0 or
            feat_dict.get("spo2", 98.0) < 90.0 or
            feat_dict.get("gcs", 15.0) <= 13.0 or
            feat_dict.get("sbp", 120.0) < 90.0 or
            feat_dict.get("heart_rate", 80.0) > 130.0
        )

        # 6. Local Explainability Calculation (Logit Contributions)
        # For class k: contribution_j = z_j * beta_{k, j}
        coefficients = self.model.coef_[class_idx]  # Shape (num_features,)
        z_scores = X_scaled[0]
        logit_contributions = z_scores * coefficients

        # Rank features by positive contribution to the predicted class
        ranked_indices = np.argsort(-logit_contributions)
        
        top_factors = []
        raw_contributions = {}
        for idx in ranked_indices:
            fname = self.feature_names[idx]
            c_val = float(logit_contributions[idx])
            r_val = float(feat_dict[fname])
            raw_contributions[fname] = round(c_val, 4)

            # Filter and format top positive contributing factors
            if len(top_factors) < 4:
                formatted = self._format_factor_explanation(fname, r_val, patient_data, c_val)
                if formatted and formatted not in top_factors:
                    top_factors.append(formatted)

        # Fallback if no specific condition triggered
        if not top_factors:
            top_factors.append({
                "factor": "Baseline Clinical Presentation",
                "detail": f"Stable vitals consistent with {ESI_NAMES[predicted_level]}",
                "contribution": 0.5,
                "severity_impact": "low"
            })

        return {
            "patient_id": patient_data.get("patient_id", "P-UNKNOWN"),
            "predicted_triage_level": predicted_level,
            "triage_level_name": ESI_NAMES[predicted_level],
            "risk_score": risk_score,
            "is_high_risk": is_high_risk,
            "confidence": round(confidence, 4),
            "class_probabilities": {
                f"Level_{c}": round(float(p), 4) for c, p in zip(self.classes, probs)
            },
            "top_factors": top_factors,
            "raw_contributions": raw_contributions,
            "prototype_disclaimer": "Generated from synthetic prototype data for development and architecture demonstration. NOT clinically certified."
        }

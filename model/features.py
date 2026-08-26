"""
PatientTriage.ai — Feature Preparation Pipeline

Extracts, engineers, and standardizes interpretable clinical features from raw
patient intake records and contextual hospital capacity snapshots.

STRICT CONSTRAINTS:
Target/label fields (synthetic_esi_level, synthetic_risk_score, is_high_risk,
recommended_bed_unit, key_explainability_factors) and raw identifiers
(patient_id, full_name, dob, arrival_timestamp) MUST NEVER be used as model inputs.
"""

import re
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd
import model._bootstrap  # noqa: F401
from sklearn.preprocessing import StandardScaler


# Explicit list of model feature columns (strictly inputs only)
FEATURE_COLUMNS = [
    # Physiological Vitals
    "heart_rate",
    "sbp",
    "dbp",
    "spo2",
    "respiratory_rate",
    "temperature_c",
    "gcs",
    "pulse_pressure",
    "mean_arterial_pressure",
    
    # Demographics & Presentation
    "age",
    "is_geriatric",
    "is_pediatric",
    "gender_is_female",
    "is_ambulance_or_air",
    
    # High-Risk Clinical Syndromes & Symptoms
    "flag_chest_pain",
    "flag_respiratory_distress",
    "flag_stroke_neuro",
    "flag_severe_trauma",
    "flag_sepsis_fever",
    "flag_severe_pain_abdominal",
    
    # Clinician Observations of Distress
    "obs_cyanotic",
    "obs_pale_diaphoretic",
    "obs_unresponsive_or_lethargic",
    "obs_confused",
    "obs_labored_breathing",
    
    # Medical History & Comorbidities
    "comorbidity_count",
    "flag_cardiac_history",
    "flag_pulmonary_history",
    "flag_diabetes_kidney",
    "has_known_allergies",
    
    # Contextual Hospital Capacity
    "waiting_room_occupancy_ratio"
]

NUMERICAL_COLS = [
    "heart_rate",
    "sbp",
    "dbp",
    "spo2",
    "respiratory_rate",
    "temperature_c",
    "gcs",
    "pulse_pressure",
    "mean_arterial_pressure",
    "age",
    "comorbidity_count",
    "waiting_room_occupancy_ratio"
]


def extract_features_from_record(record: Dict[str, Any], waiting_room_ratio: float = 0.50) -> Dict[str, float]:
    """
    Transform a single raw patient intake dictionary into a flat numerical/binary feature dictionary.
    Guarantees no target or identifier leakage.
    """
    # 1. Vital Signs
    hr = float(record.get("heart_rate", 75.0))
    sbp = float(record.get("sbp", 120.0))
    dbp = float(record.get("dbp", 80.0))
    spo2 = float(record.get("spo2", 98.0))
    rr = float(record.get("respiratory_rate", 16.0))
    temp_c = float(record.get("temperature_c", 37.0))
    gcs = float(record.get("gcs", 15.0))
    
    pulse_pressure = sbp - dbp
    map_bp = (2.0 * dbp + sbp) / 3.0

    # 2. Demographics & Arrival Mode
    age = float(record.get("age", 40.0))
    is_geriatric = 1.0 if age >= 65.0 else 0.0
    is_pediatric = 1.0 if age < 18.0 else 0.0
    
    gender_raw = str(record.get("gender", "")).strip().upper()
    gender_is_female = 1.0 if gender_raw == "F" else 0.0
    
    arrival_mode = str(record.get("arrival_mode", "")).lower()
    is_ambulance_or_air = 1.0 if ("ambulance" in arrival_mode or "helicopter" in arrival_mode) else 0.0

    # 3. Chief Complaint & Symptoms text parsing
    text_corpus = (
        str(record.get("chief_complaint", "")) + " " +
        str(record.get("symptoms", ""))
    ).lower()

    flag_chest_pain = 1.0 if any(k in text_corpus for k in ["chest pain", "angina", "substernal", "myocardial", "cardiac arrest"]) else 0.0
    flag_respiratory = 1.0 if any(k in text_corpus for k in ["shortness of breath", "dyspnea", "wheezing", "stridor", "asthma", "asphyxiation", "respiratory"]) else 0.0
    flag_stroke = 1.0 if any(k in text_corpus for k in ["stroke", "hemiplegia", "hemiparesis", "facial droop", "slurred speech", "syncope", "unconscious", "unresponsive"]) else 0.0
    flag_trauma = 1.0 if any(k in text_corpus for k in ["trauma", "motor vehicle", "collision", "fall", "fracture", "hemorrhage", "laceration", "wound"]) else 0.0
    flag_sepsis = 1.0 if any(k in text_corpus for k in ["sepsis", "high fever", "chills", "rigors", "pyelonephritis"]) else 0.0
    flag_abdominal = 1.0 if any(k in text_corpus for k in ["abdominal pain", "flank pain", "renal colic", "vomiting", "hematemesis", "melena"]) else 0.0

    # 4. Clinician Observations
    obs_raw = str(record.get("clinician_observations", "")).lower()
    obs_cyanotic = 1.0 if "cyanotic" in obs_raw else 0.0
    obs_pale = 1.0 if ("pale" in obs_raw or "diaphoretic" in obs_raw) else 0.0
    obs_unresponsive = 1.0 if ("unresponsive" in obs_raw or "lethargic" in obs_raw or "unconscious" in obs_raw) else 0.0
    obs_confused = 1.0 if "confused" in obs_raw else 0.0
    obs_labored = 1.0 if ("labored" in obs_raw or "tripod" in obs_raw or "respirations" in obs_raw) else 0.0

    # 5. Medical History & Allergies
    med_hist = str(record.get("medical_history", "")).lower()
    comorbs = [c.strip() for c in med_hist.split(";") if c.strip() and c.strip() != "none"]
    comorbidity_count = float(len(comorbs))
    
    flag_cardiac_hist = 1.0 if any(k in med_hist for k in ["coronary", "heart failure", "atrial fibrillation", "infarction"]) else 0.0
    flag_pulmonary_hist = 1.0 if any(k in med_hist for k in ["copd", "asthma"]) else 0.0
    flag_diabetes_hist = 1.0 if any(k in med_hist for k in ["diabetes", "kidney", "ckd", "hypertension"]) else 0.0

    allergies = str(record.get("known_allergies", "")).lower()
    has_allergies = 1.0 if (allergies and "none" not in allergies) else 0.0

    # Contextual hospital capacity
    wr_ratio = float(record.get("waiting_room_occupancy_ratio", waiting_room_ratio))

    return {
        "heart_rate": hr,
        "sbp": sbp,
        "dbp": dbp,
        "spo2": spo2,
        "respiratory_rate": rr,
        "temperature_c": temp_c,
        "gcs": gcs,
        "pulse_pressure": pulse_pressure,
        "mean_arterial_pressure": map_bp,
        "age": age,
        "is_geriatric": is_geriatric,
        "is_pediatric": is_pediatric,
        "gender_is_female": gender_is_female,
        "is_ambulance_or_air": is_ambulance_or_air,
        "flag_chest_pain": flag_chest_pain,
        "flag_respiratory_distress": flag_respiratory,
        "flag_stroke_neuro": flag_stroke,
        "flag_severe_trauma": flag_trauma,
        "flag_sepsis_fever": flag_sepsis,
        "flag_severe_pain_abdominal": flag_abdominal,
        "obs_cyanotic": obs_cyanotic,
        "obs_pale_diaphoretic": obs_pale,
        "obs_unresponsive_or_lethargic": obs_unresponsive,
        "obs_confused": obs_confused,
        "obs_labored_breathing": obs_labored,
        "comorbidity_count": comorbidity_count,
        "flag_cardiac_history": flag_cardiac_hist,
        "flag_pulmonary_history": flag_pulmonary_hist,
        "flag_diabetes_kidney": flag_diabetes_hist,
        "has_known_allergies": has_allergies,
        "waiting_room_occupancy_ratio": wr_ratio
    }


class TriageFeaturePipeline:
    """
    Feature transformation and scaling pipeline for PatientTriage.ai.
    Ensures deterministic normalization across train and inference sets.
    """
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_columns = FEATURE_COLUMNS
        self.numerical_columns = NUMERICAL_COLS
        self.is_fitted = False

    def transform_df(self, df: pd.DataFrame, waiting_room_ratio: float = 0.50) -> pd.DataFrame:
        """Convert a raw DataFrame of patient records into an engineered feature DataFrame."""
        records = df.to_dict(orient="records")
        feat_dicts = [extract_features_from_record(r, waiting_room_ratio) for r in records]
        feat_df = pd.DataFrame(feat_dicts)[self.feature_columns]
        return feat_df

    def fit(self, X_df: pd.DataFrame):
        """Fit scaler on numerical feature columns."""
        self.scaler.fit(X_df[self.numerical_columns])
        self.is_fitted = True
        return self

    def transform(self, X_df: pd.DataFrame) -> np.ndarray:
        """Apply scaling and return float numpy matrix."""
        if not self.is_fitted:
            raise RuntimeError("TriageFeaturePipeline must be fitted before transforming.")
        
        X_copy = X_df.copy()
        X_copy[self.numerical_columns] = self.scaler.transform(X_copy[self.numerical_columns])
        return X_copy[self.feature_columns].values.astype(np.float64)

    def fit_transform(self, X_df: pd.DataFrame) -> np.ndarray:
        """Fit and transform in one step."""
        return self.fit(X_df).transform(X_df)

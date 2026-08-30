"""
PatientTriage.ai — Robust Feature Preparation & OOV Preprocessing Pipeline

Extracts, engineers, and standardizes interpretable clinical features from raw
patient intake records and contextual hospital capacity snapshots.

STRICT CONSTRAINTS:
Target/label fields (synthetic_esi_level, synthetic_risk_score, is_high_risk,
recommended_bed_unit, key_explainability_factors) and raw identifiers
(patient_id, full_name, dob, arrival_timestamp) MUST NEVER be used as model inputs.

ROBUSTNESS & OOV STRATEGY:
- Handles unseen, novel, or vague symptoms gracefully without feature encoding errors.
- Never raises exceptions on missing fields, NoneType, or empty strings.
- Distinguishes KNOWN INPUT, UNKNOWN/UNSEEN INPUT, and MISSING INPUT.
- Preserves balanced 5-level triage distribution.
"""

import re
from typing import Dict, List, Tuple, Any, Optional, Set
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

# Standard Adult Physiological Baselines (used only as safe fallbacks when inputs are missing)
DEFAULT_VITALS = {
    "heart_rate": 75.0,
    "sbp": 120.0,
    "dbp": 80.0,
    "spo2": 98.0,
    "respiratory_rate": 16.0,
    "temperature_c": 37.0,
    "gcs": 15.0,
    "age": 40.0
}

# Known Clinical Syndrome & Symptom Lexicons
KNOWN_CLINICAL_LEXICON = [
    # Cardiac
    "chest pain", "angina", "substernal", "myocardial", "cardiac arrest",
    "heart attack", "crushing chest", "coronary", "palpitation", "arrhythmia",
    # Respiratory
    "shortness of breath", "dyspnea", "wheezing", "stridor", "asthma",
    "asphyxiation", "respiratory distress", "suffocating", "hypoxemia", "copd",
    "cough", "sputum", "tachypnea",
    # Neurological
    "stroke", "hemiplegia", "hemiparesis", "facial droop", "slurred speech",
    "syncope", "unconscious", "unresponsive", "seizure", "altered mental",
    "aphasia", "dysarthria", "focal weakness", "coma", "confusion", "headache",
    "dizziness", "vertigo",
    # Trauma
    "trauma", "motor vehicle", "collision", "fall", "fracture", "hemorrhage",
    "laceration", "wound", "gunshot", "stab", "polytrauma", "active bleeding",
    "injury", "burn", "contusion", "head strike",
    # Sepsis & Infection
    "sepsis", "high fever", "chills", "rigors", "pyelonephritis", "bacteremia",
    "systemic infection", "urosepsis", "febrile", "abscess", "cellulitis",
    "uti", "urinary tract infection", "infection",
    # Abdominal / GI
    "abdominal pain", "flank pain", "renal colic", "vomiting", "hematemesis",
    "melena", "acute abdomen", "guarding", "rebound tenderness", "appendicitis",
    "right lower quadrant", "left lower quadrant", "right upper quadrant",
    "epigastric pain", "nausea", "diarrhea", "belly pain", "cramping", "constipation",
    # Mild / Low Acuity
    "suture removal", "minor rash", "dressing change", "earache", "sore throat",
    "mild sprain", "twisted ankle", "prescription refill", "insect bite", "abrasion",
    "cold symptoms", "congestion", "mild cough", "superficial cut", "routine",
    "itching", "pruritus", "minor burn", "ear pain", "dental pain", "weakness", "fatigue"
]

KNOWN_CHEST_PAIN_KEYWORDS = [
    "chest pain", "angina", "substernal", "myocardial", "cardiac arrest",
    "heart attack", "crushing chest", "coronary", "palpitation"
]

KNOWN_RESPIRATORY_KEYWORDS = [
    "shortness of breath", "dyspnea", "wheezing", "stridor", "asthma",
    "asphyxiation", "respiratory distress", "suffocating", "hypoxemia", "copd exacerbation"
]

KNOWN_STROKE_NEURO_KEYWORDS = [
    "stroke", "hemiplegia", "hemiparesis", "facial droop", "slurred speech",
    "syncope", "unconscious", "unresponsive", "seizure", "altered mental",
    "aphasia", "dysarthria", "focal weakness", "coma"
]

KNOWN_TRAUMA_KEYWORDS = [
    "trauma", "motor vehicle", "collision", "fall", "fracture", "hemorrhage",
    "laceration", "wound", "gunshot", "stab", "polytrauma", "active bleeding"
]

KNOWN_SEPSIS_KEYWORDS = [
    "sepsis", "high fever", "chills", "rigors", "pyelonephritis", "bacteremia",
    "systemic infection", "urosepsis", "febrile neutropenia"
]

KNOWN_ABDOMINAL_KEYWORDS = [
    "abdominal pain", "flank pain", "renal colic", "vomiting", "hematemesis",
    "melena", "acute abdomen", "guarding", "rebound tenderness", "appendicitis",
    "right lower quadrant", "left lower quadrant", "epigastric", "belly pain", "nausea"
]


def safe_float(val: Any, default: float = 0.0) -> float:
    """Safely convert any input (None, string, int, float) to float without raising exceptions."""
    if val is None or val == "":
        return float(default)
    try:
        f = float(val)
        return float(default) if np.isnan(f) or np.isinf(f) else f
    except (ValueError, TypeError):
        return float(default)


def classify_input_text(text: str) -> str:
    """
    Classify input clinical text into KNOWN, UNKNOWN/UNSEEN, or MISSING.
    """
    if not text or not str(text).strip() or str(text).strip().lower() in ["none", "n/a", "nil", "null"]:
        return "MISSING"

    t = str(text).lower()
    if any(kw in t for kw in KNOWN_CLINICAL_LEXICON):
        return "KNOWN"
    
    # Text is provided but does not match any recognized clinical syndrome lexicon
    return "UNKNOWN/UNSEEN"


def inspect_patient_inputs(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze patient record completeness and identify input classification status.
    """
    complaint_raw = record.get("chief_complaint")
    symptoms_raw = record.get("symptoms")
    obs_raw = record.get("clinician_observations")
    history_raw = record.get("medical_history")

    complaint_status = classify_input_text(complaint_raw)
    symptoms_status = classify_input_text(symptoms_raw)
    obs_status = classify_input_text(obs_raw)

    missing_fields: List[str] = []
    vital_keys = ["heart_rate", "sbp", "dbp", "spo2", "respiratory_rate", "gcs"]
    for vk in vital_keys:
        val = record.get(vk)
        if val is None or val == "":
            missing_fields.append(vk)

    has_unseen = (complaint_status == "UNKNOWN/UNSEEN") or (symptoms_status == "UNKNOWN/UNSEEN")

    input_classification = {
        "chief_complaint": complaint_status,
        "symptoms": symptoms_status,
        "vital_signs": "MISSING" if len(missing_fields) > 0 else "KNOWN",
        "clinician_observations": obs_status,
        "medical_history": "MISSING" if not history_raw or str(history_raw).lower() in ["none", "none known", "n/a"] else "KNOWN"
    }

    return {
        "input_classification": input_classification,
        "is_unseen_input": has_unseen,
        "missing_fields": missing_fields
    }


def extract_features_from_record(record: Dict[str, Any], waiting_room_ratio: float = 0.50) -> Dict[str, float]:
    """
    Transform a single raw patient intake dictionary into a flat numerical/binary feature dictionary.
    Guarantees zero exceptions on malformed, missing, or out-of-vocabulary inputs.
    Guarantees no target or identifier leakage.
    """
    # 1. Vital Signs with safe fallbacks
    hr = safe_float(record.get("heart_rate"), DEFAULT_VITALS["heart_rate"])
    sbp = safe_float(record.get("sbp"), DEFAULT_VITALS["sbp"])
    dbp = safe_float(record.get("dbp"), DEFAULT_VITALS["dbp"])
    spo2 = safe_float(record.get("spo2"), DEFAULT_VITALS["spo2"])
    rr = safe_float(record.get("respiratory_rate"), DEFAULT_VITALS["respiratory_rate"])
    temp_c = safe_float(record.get("temperature_c"), DEFAULT_VITALS["temperature_c"])
    gcs = safe_float(record.get("gcs"), DEFAULT_VITALS["gcs"])
    
    pulse_pressure = sbp - dbp
    map_bp = (2.0 * dbp + sbp) / 3.0

    # 2. Demographics & Arrival Mode
    age = safe_float(record.get("age"), DEFAULT_VITALS["age"])
    is_geriatric = 1.0 if age >= 65.0 else 0.0
    is_pediatric = 1.0 if age < 18.0 else 0.0
    
    gender_raw = str(record.get("gender", "") or "").strip().upper()
    gender_is_female = 1.0 if gender_raw == "F" else 0.0
    
    arrival_mode = str(record.get("arrival_mode", "") or "").lower()
    is_ambulance_or_air = 1.0 if ("ambulance" in arrival_mode or "helicopter" in arrival_mode) else 0.0

    # 3. Chief Complaint & Symptoms text parsing (robust matching)
    text_corpus = (
        str(record.get("chief_complaint", "") or "") + " " +
        str(record.get("symptoms", "") or "")
    ).lower()

    flag_chest_pain = 1.0 if any(k in text_corpus for k in KNOWN_CHEST_PAIN_KEYWORDS) else 0.0
    flag_respiratory = 1.0 if any(k in text_corpus for k in KNOWN_RESPIRATORY_KEYWORDS) else 0.0
    flag_stroke = 1.0 if any(k in text_corpus for k in KNOWN_STROKE_NEURO_KEYWORDS) else 0.0
    flag_trauma = 1.0 if any(k in text_corpus for k in KNOWN_TRAUMA_KEYWORDS) else 0.0
    flag_sepsis = 1.0 if any(k in text_corpus for k in KNOWN_SEPSIS_KEYWORDS) else 0.0
    flag_abdominal = 1.0 if any(k in text_corpus for k in KNOWN_ABDOMINAL_KEYWORDS) else 0.0

    # 4. Clinician Observations
    obs_raw = str(record.get("clinician_observations", "") or "").lower()
    obs_cyanotic = 1.0 if "cyanotic" in obs_raw else 0.0
    obs_pale = 1.0 if ("pale" in obs_raw or "diaphoretic" in obs_raw) else 0.0
    obs_unresponsive = 1.0 if ("unresponsive" in obs_raw or "lethargic" in obs_raw or "unconscious" in obs_raw) else 0.0
    obs_confused = 1.0 if "confused" in obs_raw else 0.0
    obs_labored = 1.0 if ("labored" in obs_raw or "tripod" in obs_raw or "retractions" in obs_raw) else 0.0

    # 5. Medical History & Allergies
    med_hist = str(record.get("medical_history", "") or "").lower()
    comorbs = [c.strip() for c in med_hist.split(";") if c.strip() and c.strip() not in ["none", "none known", "n/a"]]
    comorbidity_count = float(len(comorbs))
    
    flag_cardiac_hist = 1.0 if any(k in med_hist for k in ["coronary", "heart failure", "atrial fibrillation", "infarction", "cad", "chf"]) else 0.0
    flag_pulmonary_hist = 1.0 if any(k in med_hist for k in ["copd", "asthma", "emphysema"]) else 0.0
    flag_diabetes_hist = 1.0 if any(k in med_hist for k in ["diabetes", "kidney", "ckd", "hypertension"]) else 0.0

    allergies = str(record.get("known_allergies", "") or "").lower()
    has_allergies = 1.0 if (allergies and "none" not in allergies and "n/a" not in allergies) else 0.0

    # Contextual hospital capacity
    wr_ratio = safe_float(record.get("waiting_room_occupancy_ratio"), waiting_room_ratio)

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

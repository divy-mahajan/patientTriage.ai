"""
PatientTriage.ai — Milestone 2 Test Suite (Interpretable Priority/Risk ML Model)

Tests:
1. Model Artifact Existence & Loading
2. Feature Pipeline Transformation & Label Non-Inclusion
3. Prediction Output Shape, Types, and Keys
4. Risk Score Range & Bounds [0.0, 100.0]
5. Predicted Triage Level Validity (ESI 1-5)
6. High-Risk Flag Evaluation & Physiological Safety Net
7. Explainability Output & Factor Formatting
8. Deterministic & Reproducible Inference
9. Contextual Hospital Capacity Handling
"""

import os
import pytest
import numpy as np
import pandas as pd

from model.predictor import TriagePredictor, ESI_NAMES
from model.features import TriageFeaturePipeline, FEATURE_COLUMNS, extract_features_from_record
from model.train import train_triage_model
from model.evaluate import evaluate_model


ARTIFACT_PATH = "model/artifacts/triage_model.joblib"
DATA_PATH = "data/synthetic/patients_synthetic.csv"


@pytest.fixture(scope="module")
def predictor():
    """Ensure trained model artifact exists and initialize predictor."""
    if not os.path.exists(ARTIFACT_PATH):
        train_triage_model(data_path=DATA_PATH, artifact_path=ARTIFACT_PATH)
    return TriagePredictor(artifact_path=ARTIFACT_PATH)


# ==============================================================================
# 1. Model Loading & Feature Pipeline Tests
# ==============================================================================

def test_model_artifact_loading(predictor):
    """Verify that model artifact loads successfully with all required components."""
    assert predictor.model is not None
    assert predictor.pipeline is not None
    assert predictor.feature_names == FEATURE_COLUMNS
    assert set(predictor.classes) == {1, 2, 3, 4, 5}
    assert "model_type" in predictor.metadata


def test_target_columns_not_in_features():
    """Verify that label/target columns are strictly excluded from model feature inputs."""
    forbidden_targets = [
        "synthetic_esi_level",
        "synthetic_risk_score",
        "is_high_risk",
        "recommended_bed_unit",
        "key_explainability_factors",
        "patient_id",
        "full_name",
        "dob",
        "arrival_timestamp"
    ]
    for target in forbidden_targets:
        assert target not in FEATURE_COLUMNS, f"Target/identifier '{target}' was found in model input features!"


def test_feature_extraction_single_record():
    """Verify that single record feature extraction works correctly and produces all expected keys."""
    raw_patient = {
        "heart_rate": 115,
        "sbp": 92,
        "dbp": 60,
        "spo2": 88,
        "respiratory_rate": 26,
        "temperature_c": 38.5,
        "gcs": 13,
        "age": 68,
        "gender": "F",
        "arrival_mode": "Ambulance (EMS)",
        "chief_complaint": "Severe chest pain radiating to left shoulder",
        "symptoms": "Chest Pain; Dyspnea; Nausea",
        "clinician_observations": "Pale / Diaphoretic; Labored Breathing",
        "medical_history": "Hypertension; Type 2 Diabetes; Coronary Artery Disease",
        "known_allergies": "Penicillin"
    }
    feats = extract_features_from_record(raw_patient, waiting_room_ratio=0.75)
    assert len(feats) == len(FEATURE_COLUMNS)
    assert feats["heart_rate"] == 115.0
    assert feats["spo2"] == 88.0
    assert feats["pulse_pressure"] == 32.0  # 92 - 60
    assert feats["is_geriatric"] == 1.0     # age 68 >= 65
    assert feats["is_ambulance_or_air"] == 1.0
    assert feats["flag_chest_pain"] == 1.0
    assert feats["obs_pale_diaphoretic"] == 1.0
    assert feats["waiting_room_occupancy_ratio"] == 0.75


# ==============================================================================
# 2. Prediction Output, Shape & Bounds Tests
# ==============================================================================

def test_prediction_output_structure(predictor):
    """Verify prediction return dictionary has all required keys and correct data types."""
    patient = {
        "patient_id": "P-TEST-001",
        "heart_rate": 78,
        "sbp": 122,
        "dbp": 78,
        "spo2": 99,
        "respiratory_rate": 16,
        "temperature_c": 36.8,
        "gcs": 15,
        "age": 32,
        "gender": "M",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Laceration to index finger from kitchen knife",
        "symptoms": "Laceration; Localized pain",
        "clinician_observations": "Calm; Alert",
        "medical_history": "None",
        "known_allergies": "None known"
    }
    res = predictor.predict(patient)

    required_keys = [
        "patient_id",
        "predicted_triage_level",
        "triage_level_name",
        "risk_score",
        "is_high_risk",
        "confidence",
        "class_probabilities",
        "top_factors",
        "raw_contributions"
    ]
    for k in required_keys:
        assert k in res, f"Missing key '{k}' in prediction result"

    assert res["patient_id"] == "P-TEST-001"
    assert res["predicted_triage_level"] in [1, 2, 3, 4, 5]
    assert isinstance(res["triage_level_name"], str)
    assert 0.0 <= res["risk_score"] <= 100.0
    assert isinstance(res["is_high_risk"], bool)
    assert 0.0 <= res["confidence"] <= 1.0
    assert len(res["class_probabilities"]) == 5
    assert sum(res["class_probabilities"].values()) == pytest.approx(1.0, abs=1e-3)


# ==============================================================================
# 3. High-Risk & Resuscitation Clinical Tests
# ==============================================================================

def test_critical_resuscitation_patient_flagged_high_risk(predictor):
    """Verify that an unstable, profound shock patient is flagged as ESI 1 and is_high_risk=True."""
    critical_patient = {
        "patient_id": "P-CRITICAL-001",
        "heart_rate": 165,
        "sbp": 60,
        "dbp": 35,
        "spo2": 72,
        "respiratory_rate": 42,
        "temperature_c": 35.2,
        "gcs": 5,
        "age": 62,
        "gender": "M",
        "arrival_mode": "Helicopter (Air Ambulance)",
        "chief_complaint": "Major polytrauma with profound hemorrhagic shock",
        "symptoms": "Unresponsive; Massive hemorrhage",
        "clinician_observations": "Cyanotic; Unresponsive; Weak thready pulse",
        "medical_history": "None",
        "known_allergies": "None known"
    }
    res = predictor.predict(critical_patient)
    assert res["predicted_triage_level"] == 1
    assert res["is_high_risk"] is True
    assert res["risk_score"] >= 85.0


def test_non_urgent_patient_low_risk(predictor):
    """Verify that a simple medication refill / minor cold patient is flagged as ESI 4 or 5 and not high-risk."""
    minor_patient = {
        "patient_id": "P-MINOR-001",
        "heart_rate": 68,
        "sbp": 118,
        "dbp": 76,
        "spo2": 99,
        "respiratory_rate": 14,
        "temperature_c": 36.6,
        "gcs": 15,
        "age": 28,
        "gender": "F",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Request for routine refill of birth control prescription",
        "symptoms": "Medication refill",
        "clinician_observations": "Comfortable; Asymptomatic",
        "medical_history": "None",
        "known_allergies": "None known"
    }
    res = predictor.predict(minor_patient)
    assert res["predicted_triage_level"] in [4, 5]
    assert res["is_high_risk"] is False
    assert res["risk_score"] < 40.0


# ==============================================================================
# 4. Explainability & Factor Attribution Tests
# ==============================================================================

def test_explainability_factors_populated(predictor):
    """Verify that top contributing factors are returned with readable descriptions and severity impacts."""
    chest_pain_patient = {
        "patient_id": "P-CHEST-001",
        "heart_rate": 126,
        "sbp": 88,
        "dbp": 54,
        "spo2": 88,
        "respiratory_rate": 28,
        "temperature_c": 37.0,
        "gcs": 14,
        "age": 59,
        "gender": "M",
        "arrival_mode": "Ambulance (EMS)",
        "chief_complaint": "Severe substernal chest pressure and shortness of breath",
        "symptoms": "Chest Pain; Shortness of Breath; Diaphoresis",
        "clinician_observations": "Pale / Diaphoretic; Labored Breathing",
        "medical_history": "Coronary Artery Disease; Hypertension",
        "known_allergies": "Aspirin"
    }
    res = predictor.predict(chest_pain_patient)
    factors = res["top_factors"]
    assert len(factors) > 0, "Explainability factor list should not be empty"
    for factor in factors:
        assert "factor" in factor
        assert "detail" in factor
        assert "contribution" in factor
        assert "severity_impact" in factor


# ==============================================================================
# 5. Determinism & Evaluation Pipeline Tests
# ==============================================================================

def test_deterministic_predictions(predictor):
    """Verify that repeated predictions on identical input produce identical output values."""
    patient = {
        "heart_rate": 95,
        "sbp": 130,
        "dbp": 82,
        "spo2": 96,
        "respiratory_rate": 20,
        "temperature_c": 38.2,
        "gcs": 15,
        "age": 45,
        "gender": "F",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Right lower quadrant abdominal pain with nausea",
        "symptoms": "Abdominal Pain; Nausea",
        "clinician_observations": "Guarding",
        "medical_history": "None",
        "known_allergies": "None known"
    }
    res1 = predictor.predict(patient)
    res2 = predictor.predict(patient)

    assert res1["predicted_triage_level"] == res2["predicted_triage_level"]
    assert res1["risk_score"] == res2["risk_score"]
    assert res1["confidence"] == res2["confidence"]
    assert res1["class_probabilities"] == res2["class_probabilities"]


def test_evaluate_model_pipeline():
    """Verify the evaluate_model function executes and returns comprehensive evaluation metrics."""
    metrics = evaluate_model(data_path=DATA_PATH, artifact_path=ARTIFACT_PATH)
    assert metrics["accuracy"] >= 0.80
    assert metrics["macro_f1"] >= 0.75
    assert metrics["high_risk_evaluation"]["roc_auc"] >= 0.90
    assert len(metrics["per_class_metrics"]) == 5
    assert len(metrics["confusion_matrix"]) == 5

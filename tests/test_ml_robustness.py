"""
PatientTriage.ai — ML Robustness & Triage Distribution Test Suite

Tests:
1. Unseen / out-of-vocabulary symptoms (e.g., Hyperventilation)
2. Missing symptoms & vague complaints
3. Missing / empty vital signs (safe fallbacks, uncertainty penalty)
4. Normal / low-risk patient triage (Level 4/5)
5. Moderate-risk patient triage (Level 3)
6. High-risk / critical patient triage (Level 1/2)
7. Pediatric patient cohort handling
8. Geriatric patient cohort handling
9. Five-level triage distribution across synthetic cohort
10. Safety invariant: Never silently downgrade unstable physiology
"""

import pytest
import pandas as pd
from model.predictor import TriagePredictor
from backend.app.services.triage_service import triage_service
from backend.app.schemas.triage import TriageScoreRequest
from backend.app.schemas.patient import PatientCreate


@pytest.fixture(scope="module")
def predictor():
    return TriagePredictor()


def test_unseen_symptom_handling(predictor):
    """
    Requirement A: Unseen symptoms (e.g., Hyperventilation) must not cause
    feature encoding errors, arbitrary high-risk escalation, or model crashes.
    """
    unseen_patient = {
        "patient_id": "P-TEST-UNSEEN",
        "full_name": "Sterling, Arthur",
        "age": 34,
        "gender": "M",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Hyperventilation and feeling lightheaded after exam",
        "symptoms": "Tingling in fingertips; Rapid shallow breathing",
        "clinician_observations": "Anxious, otherwise alert and oriented",
        "known_allergies": "None known",
        "medical_history": "None",
        "heart_rate": 86,
        "sbp": 124,
        "dbp": 78,
        "spo2": 99,
        "respiratory_rate": 20,
        "temperature_c": 36.8,
        "gcs": 15
    }

    res = predictor.predict(unseen_patient)

    # 1. Must produce a valid dictionary without raising exceptions
    assert res is not None
    assert "predicted_triage_level" in res
    assert res["predicted_triage_level"] in [1, 2, 3, 4, 5]

    # 2. Must not arbitrarily classify normal vitals + unseen symptom as Level 1
    assert res["predicted_triage_level"] >= 3
    assert res["is_high_risk"] is False

    # 3. Must distinguish unseen input and flag clinician review
    assert res["is_unseen_input"] is True
    assert res["input_classification"]["chief_complaint"] == "UNKNOWN/UNSEEN"
    assert res["needs_clinician_review"] is True
    assert res["uncertainty_reason"] is not None
    assert "Unseen" in res["uncertainty_reason"]


def test_missing_symptom_handling(predictor):
    """
    Requirement A: Missing or empty symptoms must be handled safely.
    """
    missing_symptom_patient = {
        "patient_id": "P-TEST-NO-SYMPTOMS",
        "full_name": "Doe, Jane",
        "age": 42,
        "gender": "F",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Suture removal from left thumb laceration",
        "symptoms": "",
        "clinician_observations": "",
        "known_allergies": "",
        "medical_history": "",
        "heart_rate": 72,
        "sbp": 118,
        "dbp": 76,
        "spo2": 99,
        "respiratory_rate": 14,
        "temperature_c": 36.9,
        "gcs": 15
    }

    res = predictor.predict(missing_symptom_patient)
    assert res is not None
    assert res["input_classification"]["symptoms"] == "MISSING"
    assert res["predicted_triage_level"] in [4, 5]
    assert res["is_high_risk"] is False


def test_missing_vital_signs_fallback(predictor):
    """
    Requirement A/C: Missing or null vital signs must use safe baseline defaults
    without crashing, flag missing fields, and apply uncertainty penalties.
    """
    patient_missing_vitals = {
        "patient_id": "P-TEST-MISSING-VITALS",
        "full_name": "Incomplete Record",
        "age": 50,
        "gender": "M",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Mild headache for 2 days",
        "symptoms": "Headache",
        "clinician_observations": "Alert",
        "known_allergies": "None",
        "medical_history": "None",
        "heart_rate": None,  # Missing
        "sbp": "",           # Empty string
        "dbp": None,         # Missing
        "spo2": None,        # Missing
        "respiratory_rate": None,
        "temperature_c": None,
        "gcs": None
    }

    res = predictor.predict(patient_missing_vitals)
    assert res is not None
    assert len(res["missing_fields"]) > 0
    assert "heart_rate" in res["missing_fields"]
    assert "sbp" in res["missing_fields"]
    assert res["needs_clinician_review"] is True
    assert res["uncertainty_reason"] is not None
    assert "Missing vital sign" in res["uncertainty_reason"]
    assert res["confidence"] < 0.85


def test_normal_low_risk_patient(predictor):
    """
    Requirement B: A healthy/low-risk patient presentation should be Level 4 or Level 5.
    """
    low_risk_patient = {
        "patient_id": "P-TEST-LOW-RISK",
        "full_name": "Healthy Individual",
        "age": 25,
        "gender": "F",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Minor dressing change and suture check",
        "symptoms": "None",
        "clinician_observations": "Well-appearing, non-toxic",
        "known_allergies": "None known",
        "medical_history": "None",
        "heart_rate": 70,
        "sbp": 116,
        "dbp": 74,
        "spo2": 99,
        "respiratory_rate": 14,
        "temperature_c": 36.7,
        "gcs": 15
    }

    res = predictor.predict(low_risk_patient)
    assert res["predicted_triage_level"] in [4, 5]
    assert res["is_high_risk"] is False
    assert res["risk_score"] < 40.0


def test_moderate_risk_patient(predictor):
    """
    Requirement B: A moderate patient presentation should resolve to Level 3 Urgent.
    """
    moderate_patient = {
        "patient_id": "P-TEST-MODERATE",
        "full_name": "Moderate Patient",
        "age": 48,
        "gender": "M",
        "arrival_mode": "Private Vehicle",
        "chief_complaint": "Moderate right lower quadrant abdominal pain and nausea",
        "symptoms": "Abdominal Pain; Nausea",
        "clinician_observations": "Guarding noted, stable hemodynamics",
        "known_allergies": "Penicillin",
        "medical_history": "Hypertension",
        "heart_rate": 88,
        "sbp": 134,
        "dbp": 84,
        "spo2": 98,
        "respiratory_rate": 18,
        "temperature_c": 37.8,
        "gcs": 15
    }

    res = predictor.predict(moderate_patient)
    assert res["predicted_triage_level"] == 3
    assert 40.0 <= res["risk_score"] <= 65.0


def test_high_risk_emergent_patient(predictor):
    """
    Requirement B: An unstable acute patient must be classified as Level 1 or Level 2.
    """
    emergent_patient = {
        "patient_id": "P-TEST-EMERGENT",
        "full_name": "Acute Cardiac",
        "age": 64,
        "gender": "M",
        "arrival_mode": "Ambulance (EMS)",
        "chief_complaint": "Severe crushing substernal chest pain radiating to left arm",
        "symptoms": "Chest Pain; Diaphoresis; Shortness of Breath",
        "clinician_observations": "Pale, diaphoretic, acute distress",
        "known_allergies": "Aspirin",
        "medical_history": "Coronary Artery Disease; Hypertension",
        "heart_rate": 118,
        "sbp": 86,
        "dbp": 54,
        "spo2": 90,
        "respiratory_rate": 26,
        "temperature_c": 37.1,
        "gcs": 14
    }

    res = predictor.predict(emergent_patient)
    assert res["predicted_triage_level"] in [1, 2]
    assert res["is_high_risk"] is True
    assert res["risk_score"] >= 70.0


def test_safety_invariant_never_silently_downgrade(predictor):
    """
    Requirement C: Unstable physiological vitals (e.g., profound hypoxemia SpO2 82% or GCS 7)
    must always result in Level 1 Resuscitation regardless of complaint or missing fields.
    """
    critical_unstable = {
        "patient_id": "P-TEST-CRITICAL-SAFETY",
        "full_name": "Unstable Vitals Patient",
        "age": 55,
        "gender": "F",
        "arrival_mode": "Ambulance (EMS)",
        "chief_complaint": "Unspecified weakness",  # Vague complaint
        "symptoms": "",                             # Missing symptoms
        "clinician_observations": "Cyanotic, poorly responsive",
        "known_allergies": "None",
        "medical_history": "None",
        "heart_rate": 145,
        "sbp": 68,
        "dbp": 40,
        "spo2": 82,   # Critical hypoxemia
        "respiratory_rate": 34,
        "temperature_c": 38.9,
        "gcs": 7      # Comatose / severe
    }

    res = predictor.predict(critical_unstable)
    # Must hold the safety floor: Level 1 Resuscitation
    assert res["predicted_triage_level"] == 1
    assert res["is_high_risk"] is True
    assert res["risk_score"] >= 90.0


def test_pediatric_cohort_service_integration():
    """
    Requirement E: Pediatric patients (<18y) must be flagged with pediatric cohort guidance.
    """
    pediatric_payload = PatientCreate(
        patient_id="P-TEST-PED-01",
        full_name="Tommy Miller",
        age=5,
        gender="M",
        arrival_mode="Private Vehicle",
        chief_complaint="High fever and ear pulling",
        symptoms="Fever; Otalgia",
        clinician_observations="Fussy but consolable",
        known_allergies="None known",
        medical_history="None",
        heart_rate=120,
        sbp=102,
        dbp=64,
        spo2=99,
        respiratory_rate=24,
        temperature_c=38.6,
        gcs=15
    )

    req = TriageScoreRequest(patient_data=pediatric_payload)
    resp = triage_service.score_patient(db=None, request=req)

    assert resp.age_group == "Pediatric"
    assert len(resp.age_specific_notes) > 0
    assert resp.predicted_triage_level in [3, 4]


def test_geriatric_cohort_service_integration():
    """
    Requirement E: Geriatric patients (65+y) must be flagged with geriatric cohort guidance.
    """
    geriatric_payload = PatientCreate(
        patient_id="P-TEST-GER-01",
        full_name="Evelyn Vance",
        age=82,
        gender="F",
        arrival_mode="Walk-in",
        chief_complaint="Dizziness and mild generalized weakness",
        symptoms="Dizziness; Fatigue",
        clinician_observations="Alert, frail",
        known_allergies="Sulfa drugs",
        medical_history="Hypertension; Osteoporosis",
        heart_rate=76,
        sbp=138,
        dbp=82,
        spo2=97,
        respiratory_rate=16,
        temperature_c=36.8,
        gcs=15
    )

    req = TriageScoreRequest(patient_data=geriatric_payload)
    resp = triage_service.score_patient(db=None, request=req)

    assert resp.age_group == "Geriatric"
    assert len(resp.age_specific_notes) > 0


def test_5_level_cohort_distribution(predictor):
    """
    Requirement B: The 5-level distribution across the synthetic patient cohort
    must show representation across all levels 1 to 5.
    """
    df = pd.read_csv("data/synthetic/patients_synthetic.csv")
    predictions = [predictor.predict(row.to_dict())["predicted_triage_level"] for _, row in df.iterrows()]
    counts = pd.Series(predictions).value_counts().to_dict()

    # All 5 levels must be represented
    for level in [1, 2, 3, 4, 5]:
        assert level in counts, f"Level {level} missing from predictions"
        assert counts[level] > 0, f"Level {level} has zero predictions"

    # Level 3 should be the most common (standard emergency triage epidemiology)
    assert counts[3] > counts[1]
    # Levels 4 and 5 must have solid representation
    assert counts[4] >= 50
    assert counts[5] >= 25

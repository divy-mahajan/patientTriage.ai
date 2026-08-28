"""
Unit & Integration Tests for Stage A: Age-Aware Assessment & Data Quality Validation
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.age_service import age_service
from backend.app.services.data_quality_service import data_quality_service

client = TestClient(app)


def test_age_group_classification():
    # Pediatric (< 18)
    assert age_service.get_age_group(5) == "Pediatric"
    assert age_service.get_age_group(17) == "Pediatric"
    
    # Adult (18 - 64)
    assert age_service.get_age_group(18) == "Adult"
    assert age_service.get_age_group(45) == "Adult"
    assert age_service.get_age_group(64) == "Adult"
    
    # Geriatric (65+)
    assert age_service.get_age_group(65) == "Geriatric"
    assert age_service.get_age_group(88) == "Geriatric"


def test_pediatric_vital_evaluation():
    pediatric_record = {
        "age": 4,
        "heart_rate": 150.0,
        "sbp": 65.0,
        "dbp": 40.0,
        "spo2": 95.0,
        "respiratory_rate": 34.0,
        "temperature_c": 38.0,
        "gcs": 15.0
    }
    eval_res = age_service.evaluate_age_context(pediatric_record)
    assert eval_res["age_group"] == "Pediatric"
    assert len(eval_res["age_specific_notes"]) > 0
    assert any("tachycardia" in n.lower() or "pediatric" in n.lower() for n in eval_res["age_specific_notes"])


def test_geriatric_vital_evaluation():
    geriatric_record = {
        "age": 78,
        "heart_rate": 105.0,
        "sbp": 95.0,
        "dbp": 60.0,
        "spo2": 93.0,
        "respiratory_rate": 22.0,
        "temperature_c": 37.9,
        "gcs": 14.0
    }
    eval_res = age_service.evaluate_age_context(geriatric_record)
    assert eval_res["age_group"] == "Geriatric"
    assert any("geriatric" in n.lower() for n in eval_res["age_specific_notes"])


def test_data_quality_complete():
    complete_record = {
        "full_name": "Sharma, Rajesh",
        "age": 45,
        "gender": "M",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Acute severe right lower quadrant pain with nausea for 12 hours",
        "symptoms": "Severe Abdominal Pain; Nausea",
        "medical_history": "Hypertension; Hyperlipidemia",
        "heart_rate": 88.0,
        "sbp": 130.0,
        "dbp": 82.0,
        "spo2": 98.0,
        "respiratory_rate": 18.0,
        "temperature_c": 37.2,
        "gcs": 15.0
    }
    dq_res = data_quality_service.evaluate_data_quality(complete_record)
    assert dq_res["data_quality"] == "Complete"
    assert dq_res["needs_clinician_review"] is False
    assert len(dq_res["data_quality_issues"]) == 0


def test_data_quality_zero_history():
    zero_history_record = {
        "full_name": "Patel, Amit",
        "age": 29,
        "gender": "M",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Pleuritic chest pain after lifting heavy weight",
        "symptoms": "Chest Pain (Pleuritic)",
        "medical_history": "None",
        "heart_rate": 78.0,
        "sbp": 120.0,
        "dbp": 80.0,
        "spo2": 99.0,
        "respiratory_rate": 16.0,
        "temperature_c": 36.8,
        "gcs": 15.0
    }
    dq_res = data_quality_service.evaluate_data_quality(zero_history_record)
    assert dq_res["data_quality"] == "Limited"
    assert any("zero" in i.lower() or "history" in i.lower() for i in dq_res["data_quality_issues"])


def test_data_quality_conflicting_signal():
    conflicting_record = {
        "full_name": "Test Conflict",
        "age": 55,
        "gender": "F",
        "arrival_mode": "Ambulance (EMS)",
        "chief_complaint": "Severe respiratory distress and lethargy",
        "symptoms": "Shortness of Breath",
        "medical_history": "Asthma",
        "heart_rate": 110.0,
        "sbp": 110.0,
        "dbp": 70.0,
        "spo2": 82.0,  # Critical hypoxemia
        "respiratory_rate": 10.0,  # Normal/slow respirations (Conflicting signal)
        "temperature_c": 37.0,
        "gcs": 15.0
    }
    dq_res = data_quality_service.evaluate_data_quality(conflicting_record)
    assert dq_res["data_quality"] == "Limited"
    assert dq_res["needs_clinician_review"] is True
    assert any("conflicting" in i.lower() for i in dq_res["data_quality_issues"])


def test_api_triage_score_stage_a_integration():
    # Direct payload scoring with pediatric patient
    payload = {
        "patient_data": {
            "full_name": "Gupta, Ananya",
            "age": 7,
            "gender": "F",
            "arrival_mode": "Private Vehicle",
            "chief_complaint": "Barking cough, stridor, and high fever for 2 days",
            "symptoms": "High Fever; Stridor / Barking Cough",
            "clinician_observations": "Tachypneic; Intercostal retractions",
            "known_allergies": "None known",
            "medical_history": "None",
            "heart_rate": 135.0,
            "sbp": 85.0,
            "dbp": 55.0,
            "spo2": 93.0,
            "respiratory_rate": 32.0,
            "temperature_c": 38.9,
            "gcs": 15.0
        }
    }
    res = client.post("/api/triage/score", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["age_group"] == "Pediatric"
    assert data["data_quality"] in ["Complete", "Limited"]
    assert "age_specific_notes" in data
    assert len(data["age_specific_notes"]) > 0
    assert "needs_clinician_review" in data

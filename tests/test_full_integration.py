"""
PatientTriage.ai — Full Frontend <-> Backend End-to-End Integration Tests
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_hospital_profiles_endpoint():
    """Verify GET /api/hospital/profiles returns 200 and lists available profiles."""
    res = client.get("/api/hospital/profiles")
    assert res.status_code == 200
    data = res.json()
    assert "profiles" in data
    assert len(data["profiles"]) >= 2
    assert "active_hospital_id" in data
    assert any(p["hospital_id"] == "st_marys_general" for p in data["profiles"])
    assert any(p["hospital_id"] == "metro_trauma_center" for p in data["profiles"])


def test_hospital_capacity_and_swap():
    """Verify capacity retrieval and dynamic profile swapping."""
    # 1. Get capacity
    res = client.get("/api/hospital/capacity")
    assert res.status_code == 200
    cap = res.json()
    assert "hospital_id" in cap
    assert "units" in cap
    assert "summary" in cap

    # 2. Swap profile to metro_trauma_center
    swap_res = client.post("/api/hospital/swap-profile", json={"hospital_id": "metro_trauma_center"})
    assert swap_res.status_code == 200
    assert swap_res.json()["hospital_id"] == "metro_trauma_center"

    # 3. Swap back to st_marys_general
    swap_back = client.post("/api/hospital/swap-profile", json={"hospital_id": "st_marys_general"})
    assert swap_back.status_code == 200
    assert swap_back.json()["hospital_id"] == "st_marys_general"


def test_surge_mode_update():
    """Verify surge mode status update via PUT /api/hospital/capacity."""
    res = client.put("/api/hospital/capacity", json={"surge_status": "critical"})
    assert res.status_code == 200
    assert res.json()["surge_status"] == "critical"

    # Reset to normal
    res_normal = client.put("/api/hospital/capacity", json={"surge_status": "normal"})
    assert res_normal.status_code == 200
    assert res_normal.json()["surge_status"] == "normal"


def test_e2e_patient_intake_triage_bed_doctor_tests_flow():
    """
    Complete end-to-end integration test:
    Intake Patient -> Check Duplicates -> Score Triage -> Recommend Bed -> Assign Bed -> Assign Doctor -> Recommend Tests -> Verify in Queue.
    """
    # 1. Create Patient
    patient_payload = {
        "full_name": "Kulkarni, Sunita",
        "dob": "1978-11-20",
        "age": 47,
        "gender": "F",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Acute severe substernal chest pressure radiating to neck and back with severe diaphoresis",
        "symptoms": "Chest Pain (Substernal); Diaphoresis / Cold Sweats; Shortness of Breath (Dyspnea)",
        "clinician_observations": "Pale / Diaphoretic; Restless / Severe Distress",
        "known_allergies": "Aspirin",
        "medical_history": "Hypertension; Coronary Artery Disease",
        "heart_rate": 115.0,
        "sbp": 92.0,
        "dbp": 60.0,
        "spo2": 92.0,
        "respiratory_rate": 24.0,
        "temperature_c": 37.1,
        "gcs": 15.0
    }

    create_res = client.post("/api/patients", json=patient_payload)
    assert create_res.status_code == 201
    patient = create_res.json()
    p_id = patient["patient_id"]
    assert p_id.startswith("P-")
    assert patient["full_name"] == "Kulkarni, Sunita"
    assert patient["status"] == "waiting"

    # 2. Duplicate prevention: submitting exact same intake within 2 mins returns the same patient
    dup_res = client.post("/api/patients", json=patient_payload)
    assert dup_res.status_code in [200, 201]
    assert dup_res.json()["patient_id"] == p_id

    # 3. Score patient
    score_res = client.post("/api/triage/score", json={"patient_id": p_id})
    assert score_res.status_code == 200
    triage = score_res.json()
    assert triage["patient_id"] == p_id
    assert triage["predicted_triage_level"] in [1, 2]
    assert triage["risk_score"] > 60.0
    assert "top_factors" in triage
    assert len(triage["top_factors"]) > 0
    assert triage["age_group"] == "Adult"
    assert triage["data_quality"] == "Complete"

    # 4. Recommend Bed
    bed_rec_res = client.post("/api/beds/recommend", json={
        "patient_id": p_id,
        "predicted_triage_level": triage["predicted_triage_level"],
        "is_high_risk": triage["is_high_risk"],
        "chief_complaint": patient["chief_complaint"],
        "symptoms": patient["symptoms"],
        "medical_history": patient["medical_history"]
    })
    assert bed_rec_res.status_code == 200
    bed_data = bed_rec_res.json()
    assert "recommended_bed" in bed_data
    if bed_data["recommended_bed"]:
        bed = bed_data["recommended_bed"]
        # 5. Assign Bed
        assign_bed_res = client.post("/api/beds/assign", json={
            "patient_id": p_id,
            "unit_id": bed["unit_id"],
            "bed_id": bed["bed_id"]
        })
        assert assign_bed_res.status_code == 200
        assert assign_bed_res.json()["status"] == "active"

    # 6. Assign Doctor
    doc_res = client.post("/api/doctors/assign", json={
        "patient_id": p_id,
        "predicted_triage_level": triage["predicted_triage_level"],
        "chief_complaint": patient["chief_complaint"]
    })
    assert doc_res.status_code == 200
    assert "doctor" in doc_res.json()

    # 7. Recommend Tests
    tests_res = client.post("/api/tests/recommend", json={
        "patient_id": p_id,
        "chief_complaint": patient["chief_complaint"],
        "symptoms": patient["symptoms"],
        "medical_history": patient["medical_history"]
    })
    assert tests_res.status_code == 200
    test_data = tests_res.json()
    assert "suggested_tests" in test_data
    assert len(test_data["suggested_tests"]) > 0
    assert any("ECG" in t["name"] or "Troponin" in t["name"] for t in test_data["suggested_tests"])

    # 8. Verify patient appears in listing
    list_res = client.get("/api/patients")
    assert list_res.status_code == 200
    p_list = list_res.json()["patients"]
    assert any(p["patient_id"] == p_id for p in p_list)

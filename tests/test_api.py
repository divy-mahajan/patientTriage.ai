"""
PatientTriage.ai — Milestone 3 FastAPI Backend Integration Test Suite

Tests:
1. Health Check Endpoint
2. Patient Intake (POST /api/patients) & Retrieval (GET /api/patients, GET /api/patients/{id})
3. Hospital Capacity Retrieval (GET /api/hospital/capacity) & Live Updates (PUT /api/hospital/capacity)
4. Swappable Hospital Profile (POST /api/hospital/swap-profile)
5. ML Triage Scoring & Explainability (POST /api/triage/score)
6. Deterministic Bed Recommendation (POST /api/beds/recommend) & Assignment (POST /api/beds/assign)
7. Doctor Roster, Check-In (POST /api/doctors/check-in) & Assignment (POST /api/doctors/assign)
8. Rule-Based Diagnostic Test Suggestions (POST /api/tests/recommend)
9. Validation Error Handling & 404 / 422 Edge Cases
"""

import pytest
import uuid
from fastapi.testclient import TestClient
import model._bootstrap  # noqa: F401
from backend.app.main import app
from backend.app.db.database import Base, engine, SessionLocal
from backend.app.services.doctor_service import doctor_service
from backend.app.services.hospital_service import hospital_service


@pytest.fixture(scope="module")
def client():
    """Initialize test client, reset schema, and seed test database."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        doctor_service.seed_initial_roster_if_empty(db)
    finally:
        db.close()
    
    with TestClient(app) as test_client:
        yield test_client


# ==============================================================================
# 1. Health & Hospital Capacity Endpoints
# ==============================================================================

def test_health_endpoint(client):
    """Verify health check endpoint returns 200 and active profile details."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "active_hospital_profile" in data
    assert data["total_beds"] > 0


def test_get_hospital_capacity(client):
    """Verify capacity retrieval returns summary, waiting room, and unit breakdowns."""
    res = client.get("/api/hospital/capacity")
    assert res.status_code == 200
    data = res.json()
    assert "hospital_id" in data
    assert "summary" in data
    assert "units" in data
    assert "waiting_room" in data
    assert data["summary"]["total_beds"] == data["summary"]["available_beds"] + data["summary"]["occupied_beds"] + data["summary"]["cleaning_beds"] + data["summary"]["reserved_beds"] + data["summary"]["unavailable_beds"]


def test_update_hospital_capacity(client):
    """Verify live updates to waiting room occupancy and bed status."""
    update_payload = {
        "waiting_room_occupancy": 38,
        "surge_status": "elevated",
        "bed_updates": [
            {
                "bed_id": "ED-1",
                "status": "cleaning",
                "cleaning_minutes_remaining": 15
            }
        ]
    }
    res = client.put("/api/hospital/capacity", json=update_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["waiting_room"]["current_occupancy"] == 38
    assert data["surge_status"] == "elevated"


def test_swap_hospital_profile(client):
    """Verify dynamic swapping of hospital configuration profile."""
    # Swap to metro trauma center
    res = client.post("/api/hospital/swap-profile", json={"hospital_id": "metro_trauma_center"})
    assert res.status_code == 200
    data = res.json()
    assert data["hospital_id"] == "metro_trauma_center"
    assert data["summary"]["total_beds"] == 36

    # Swap back to St. Mary's General
    res = client.post("/api/hospital/swap-profile", json={"hospital_id": "st_marys_general"})
    assert res.status_code == 200
    data = res.json()
    assert data["hospital_id"] == "st_marys_general"
    assert data["summary"]["total_beds"] == 24


# ==============================================================================
# 2. Patient Intake & Retrieval Endpoints
# ==============================================================================

def test_patient_intake_and_retrieval(client):
    """Verify patient intake, DB persistence, and retrieval."""
    patient_payload = {
        "patient_id": "P-TEST-INTAKE-101",
        "full_name": "Doe, Jane",
        "dob": "1975-08-14",
        "age": 51,
        "gender": "F",
        "arrival_mode": "Ambulance (EMS)",
        "chief_complaint": "Acute severe crushing substernal chest pain",
        "symptoms": "Chest Pain; Diaphoresis; Shortness of Breath",
        "clinician_observations": "Pale / Diaphoretic; Severe distress",
        "known_allergies": "Penicillin",
        "medical_history": "Hypertension; Coronary Artery Disease",
        "heart_rate": 122.0,
        "sbp": 90.0,
        "dbp": 58.0,
        "spo2": 90.0,
        "respiratory_rate": 26.0,
        "temperature_c": 37.1,
        "gcs": 14.0
    }
    # 1. Create Patient
    create_res = client.post("/api/patients", json=patient_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["patient_id"] == "P-TEST-INTAKE-101"
    assert created_data["status"] == "waiting"

    # 2. Get Single Patient
    get_res = client.get("/api/patients/P-TEST-INTAKE-101")
    assert get_res.status_code == 200
    assert get_res.json()["full_name"] == "Doe, Jane"

    # 3. List Patients
    list_res = client.get("/api/patients")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1


# ==============================================================================
# 3. ML Triage Scoring Endpoint
# ==============================================================================

def test_triage_scoring_by_patient_id(client):
    """Verify triage scoring an existing patient in SQLite using the trained ML model."""
    res = client.post("/api/triage/score", json={"patient_id": "P-TEST-INTAKE-101"})
    assert res.status_code == 200
    data = res.json()
    assert data["patient_id"] == "P-TEST-INTAKE-101"
    assert data["predicted_triage_level"] in [1, 2]
    assert data["is_high_risk"] is True
    assert data["risk_score"] >= 70.0
    assert len(data["top_factors"]) > 0
    assert any("Oxygen Saturation" in f["factor"] or "Respiratory Rate" in f["factor"] or "Diaphoresis" in f["factor"] for f in data["top_factors"])

    # Verify patient workflow updated to 'triaged'
    p_check = client.get("/api/patients/P-TEST-INTAKE-101").json()
    assert p_check["status"] == "triaged"


def test_triage_scoring_direct_payload(client):
    """Verify triage scoring a direct payload without saving to DB first."""
    payload = {
        "patient_data": {
            "patient_id": "P-DIRECT-001",
            "full_name": "Quick, Patient",
            "age": 25,
            "gender": "M",
            "arrival_mode": "Walk-in",
            "chief_complaint": "Prescription refill for inhaler",
            "symptoms": "None",
            "clinician_observations": "Comfortable",
            "known_allergies": "None known",
            "medical_history": "Asthma",
            "heart_rate": 72.0,
            "sbp": 120.0,
            "dbp": 78.0,
            "spo2": 99.0,
            "respiratory_rate": 14.0,
            "temperature_c": 36.6,
            "gcs": 15.0
        }
    }
    res = client.post("/api/triage/score", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_triage_level"] in [4, 5]
    assert data["is_high_risk"] is False


# ==============================================================================
# 4. Bed Recommendation & Assignment Endpoints
# ==============================================================================

def test_bed_recommendation_and_assignment(client):
    """Verify deterministic bed recommendation and live assignment."""
    recommend_req = {
        "patient_id": "P-TEST-INTAKE-101",
        "predicted_triage_level": 2,
        "is_high_risk": True,
        "chief_complaint": "Acute severe crushing substernal chest pain",
        "symptoms": "Chest Pain; Diaphoresis",
        "required_equipment": ["cardiac_monitor", "oxygen_wall"]
    }
    # 1. Recommend Bed
    rec_res = client.post("/api/beds/recommend", json=recommend_req)
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["recommended_bed"] is not None
    top_bed = rec_data["recommended_bed"]
    assert top_bed["match_score"] > 0
    assert len(rec_data["deterministic_rule_chain"]) > 0

    # 2. Assign Bed
    assign_req = {
        "patient_id": "P-TEST-INTAKE-101",
        "bed_id": top_bed["bed_id"],
        "unit_id": top_bed["unit_id"],
        "notes": "Assigned to telemetry monitoring"
    }
    assign_res = client.post("/api/beds/assign", json=assign_req)
    assert assign_res.status_code == 200
    assign_data = assign_res.json()
    assert assign_data["bed_id"] == top_bed["bed_id"]
    assert assign_data["status"] == "active"

    # 3. Verify bed is now occupied in hospital capacity
    cap_res = client.get("/api/hospital/capacity").json()
    all_occupied_bed_ids = []
    for u in cap_res["units"]:
        for b in u["beds"]:
            if b["status"] == "occupied":
                all_occupied_bed_ids.append(b["bed_id"])
    assert top_bed["bed_id"] in all_occupied_bed_ids

    # 4. Verify patient status updated to 'assigned_bed'
    p_check = client.get("/api/patients/P-TEST-INTAKE-101").json()
    assert p_check["status"] == "assigned_bed"


# ==============================================================================
# 5. Doctor Roster, Check-In & Assignment Endpoints
# ==============================================================================

def test_doctor_endpoints(client):
    """Verify listing doctors, checking in a new doctor, and deterministic doctor assignment."""
    # 1. List doctors
    list_res = client.get("/api/doctors")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 6

    # 2. Check-in a new physician
    checkin_payload = {
        "doctor_id": "DOC-999",
        "name": "Dr. Christopher House, MD",
        "specialty": "Cardiology",
        "shift_status": "Active Shift",
        "is_available": True,
        "max_caseload": 4,
        "current_caseload": 0
    }
    checkin_res = client.post("/api/doctors/check-in", json=checkin_payload)
    assert checkin_res.status_code == 200
    assert checkin_res.json()["doctor_id"] == "DOC-999"

    # 3. Deterministically assign doctor to patient
    assign_req = {
        "patient_id": "P-TEST-INTAKE-101",
        "predicted_triage_level": 2,
        "chief_complaint": "Acute severe crushing substernal chest pain",
        "age": 51
    }
    assign_res = client.post("/api/doctors/assign", json=assign_req)
    assert assign_res.status_code == 200
    assign_data = assign_res.json()
    assert assign_data["doctor"]["specialty"] in ["Cardiology", "Emergency Medicine"]
    assert assign_data["match_score"] > 0
    assert "assigned" in assign_data["assignment_rationale"].lower()


# ==============================================================================
# 6. Diagnostic Test Recommendation Endpoint
# ==============================================================================

def test_test_recommendations(client):
    """Verify rule-based diagnostic test recommendations."""
    # Cardiac Complaint
    req = {
        "chief_complaint": "Substernal chest pressure radiating to left jaw",
        "symptoms": "Chest Pain; Diaphoresis",
        "medical_history": "Coronary Artery Disease"
    }
    res = client.post("/api/tests/recommend", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "Chest Pain" in data["matched_complaint_category"]
    test_codes = [t["code"] for t in data["suggested_tests"]]
    assert "TROPONIN_HS" in test_codes or "ECG_12LEAD" in test_codes
    assert data["is_rule_based"] is True


# ==============================================================================
# 7. Error Handling & Validation Tests
# ==============================================================================

def test_invalid_patient_input_handling(client):
    """Verify 422 Unprocessable Entity on invalid intake data."""
    invalid_payload = {
        "full_name": "",  # Blank name
        "age": 250,       # Invalid age > 125
        "gender": "M",
        "arrival_mode": "Walk-in",
        "chief_complaint": "x",  # Too short
        "heart_rate": -10.0      # Negative HR
    }
    res = client.post("/api/patients", json=invalid_payload)
    assert res.status_code == 422


def test_nonexistent_patient_queries(client):
    """Verify 404 on querying or scoring non-existent patients."""
    res = client.get("/api/patients/P-DOES-NOT-EXIST")
    assert res.status_code == 404

    score_res = client.post("/api/triage/score", json={"patient_id": "P-DOES-NOT-EXIST"})
    assert score_res.status_code == 404

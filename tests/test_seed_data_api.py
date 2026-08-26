"""
PatientTriage.ai — End-to-End API Test Suite Using Synthetic Seed Data

Validates:
1. Batch ingestion of synthetic patient records from data/synthetic/patients_synthetic.csv
2. Full clinical pipeline execution for synthetic seed patients across all 5 ESI tiers:
   - Ingestion (POST /api/patients)
   - ML Triage Scoring (POST /api/triage/score)
   - Diagnostic Test Recommendations (POST /api/tests/recommend)
   - Deterministic Bed Recommendation (POST /api/beds/recommend)
   - Deterministic Doctor Assignment (POST /api/doctors/assign)
3. Doctor Roster Verification from data/synthetic/doctors_roster.csv
4. Hospital Capacity Snapshot Updates from data/synthetic/hospital_capacity_snapshots.json
"""

import os
import json
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import model._bootstrap  # noqa: F401
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.db.database import Base, engine, SessionLocal
from backend.app.services.doctor_service import doctor_service
from backend.app.services.hospital_service import hospital_service


@pytest.fixture(scope="module")
def api_client():
    """Initialize fresh test database and client."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        doctor_service.seed_initial_roster_if_empty(db)
    finally:
        db.close()
    
    with TestClient(app) as client:
        yield client


def test_seed_doctors_roster_loaded(api_client):
    """Verify that all doctors from doctors_roster.csv are available in the API."""
    roster_df = pd.read_csv(settings.doctors_roster_path)
    res = api_client.get("/api/doctors")
    assert res.status_code == 200
    data = res.json()
    
    assert data["total"] == len(roster_df)
    api_doctor_ids = {d["doctor_id"] for d in data["doctors"]}
    for doc_id in roster_df["doctor_id"]:
        assert doc_id in api_doctor_ids


def test_seed_patients_multi_tier_pipeline(api_client):
    """
    Sample patient records from each ESI tier (1 to 5) from patients_synthetic.csv
    and run them through the full end-to-end API pipeline.
    """
    df = pd.read_csv(os.path.join("data", "synthetic", "patients_synthetic.csv"))
    
    # Select 2 representative patients from each of the 5 synthetic ESI levels (10 patients total)
    sampled_patients = df.groupby("synthetic_esi_level").head(2).to_dict(orient="records")
    assert len(sampled_patients) == 10

    for record in sampled_patients:
        # 1. POST /api/patients
        payload = {
            "patient_id": f"TEST-SEED-{record['patient_id']}",
            "full_name": record["full_name"],
            "dob": record["dob"],
            "age": int(record["age"]),
            "gender": record["gender"],
            "arrival_mode": record["arrival_mode"],
            "chief_complaint": record["chief_complaint"],
            "symptoms": record["symptoms"],
            "clinician_observations": record["clinician_observations"],
            "known_allergies": record["known_allergies"],
            "medical_history": record["medical_history"],
            "heart_rate": float(record["heart_rate"]),
            "sbp": float(record["sbp"]),
            "dbp": float(record["dbp"]),
            "spo2": float(record["spo2"]),
            "respiratory_rate": float(record["respiratory_rate"]),
            "temperature_c": float(record["temperature_c"]),
            "gcs": float(record["gcs"])
        }
        create_res = api_client.post("/api/patients", json=payload)
        assert create_res.status_code == 201, f"Failed intake for {record['patient_id']}: {create_res.text}"
        patient_data = create_res.json()
        assert patient_data["status"] == "waiting"

        # 2. POST /api/triage/score
        score_res = api_client.post("/api/triage/score", json={"patient_id": payload["patient_id"]})
        assert score_res.status_code == 200, f"Failed triage scoring: {score_res.text}"
        score_data = score_res.json()
        assert 1 <= score_data["predicted_triage_level"] <= 5
        assert 0.0 <= score_data["risk_score"] <= 100.0
        assert len(score_data["top_factors"]) > 0

        # Verify high-risk consistency
        if record["synthetic_esi_level"] in [1, 2]:
            assert score_data["is_high_risk"] is True

        # 3. POST /api/tests/recommend
        test_res = api_client.post("/api/tests/recommend", json={
            "patient_id": payload["patient_id"],
            "chief_complaint": payload["chief_complaint"],
            "symptoms": payload["symptoms"],
            "medical_history": payload["medical_history"],
            "age": payload["age"]
        })
        assert test_res.status_code == 200
        test_data = test_res.json()
        assert test_data["total_tests_recommended"] > 0
        assert len(test_data["suggested_tests"]) > 0

        # 4. POST /api/beds/recommend
        bed_res = api_client.post("/api/beds/recommend", json={
            "patient_id": payload["patient_id"],
            "predicted_triage_level": score_data["predicted_triage_level"],
            "is_high_risk": score_data["is_high_risk"],
            "chief_complaint": payload["chief_complaint"],
            "symptoms": payload["symptoms"]
        })
        assert bed_res.status_code == 200
        bed_data = bed_res.json()
        assert bed_data["recommended_bed"] is not None
        assert len(bed_data["deterministic_rule_chain"]) > 0

        # 5. POST /api/doctors/assign
        doc_res = api_client.post("/api/doctors/assign", json={
            "patient_id": payload["patient_id"],
            "predicted_triage_level": score_data["predicted_triage_level"],
            "chief_complaint": payload["chief_complaint"],
            "age": payload["age"]
        })
        assert doc_res.status_code == 200
        doc_data = doc_res.json()
        assert doc_data["doctor"]["doctor_id"] is not None
        assert doc_data["match_score"] > 0


def test_capacity_snapshots_applied_to_api(api_client):
    """
    Load capacity snapshots from hospital_capacity_snapshots.json and apply them
    to the live API, verifying live recalculation.
    """
    snap_path = os.path.join("data", "synthetic", "hospital_capacity_snapshots.json")
    with open(snap_path, "r", encoding="utf-8") as f:
        snapshots = json.load(f)

    assert len(snapshots) >= 3

    for snap in snapshots:
        waiting_room = snap.get("waiting_room", {})
        raw_surge = snap.get("surge_status", "normal").lower()
        surge_status = "critical" if "critical" in raw_surge or "surge" in raw_surge else ("elevated" if "elevated" in raw_surge or "peak" in raw_surge else "normal")
        
        # Build API update payload
        update_payload = {
            "waiting_room_occupancy": waiting_room.get("current_occupancy", 25),
            "waiting_room_capacity": waiting_room.get("capacity", 45),
            "surge_status": surge_status
        }
        
        put_res = api_client.put("/api/hospital/capacity", json=update_payload)
        assert put_res.status_code == 200
        cap_data = put_res.json()
        assert cap_data["waiting_room"]["current_occupancy"] == update_payload["waiting_room_occupancy"]
        assert cap_data["surge_status"] == update_payload["surge_status"]

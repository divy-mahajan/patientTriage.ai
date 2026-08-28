"""
PatientTriage.ai — Bed Map, Unit Availability, Release & Treatment Tests
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.database import SessionLocal
from backend.app.db.models import Patient, PatientTreatment, BedAssignment, AuditLog
from backend.app.services.hospital_service import hospital_service
from backend.app.services.treatment_service import treatment_service

client = TestClient(app)


def test_get_hospital_capacity_enriched():
    """Verify live capacity endpoint returns real beds, summary, units, and enriched patient/doctor data."""
    res = client.get("/api/hospital/capacity")
    assert res.status_code == 200
    data = res.json()

    assert "summary" in data
    assert "units" in data
    assert data["summary"]["total_beds"] > 0
    assert data["summary"]["available_beds"] >= 0
    assert data["summary"]["occupied_beds"] >= 0

    # Verify unit properties
    for u in data["units"]:
        assert "unit_id" in u
        assert "unit_name" in u
        assert "beds" in u
        for b in u["beds"]:
            assert "bed_id" in b
            assert "status" in b


def test_treatment_dynamic_remaining_calculation():
    """Verify dynamic calculation of remaining volume and low/replacement alerts."""
    t = PatientTreatment(
        id=999,
        patient_id="P-TEST-TREAT",
        name="IV Saline",
        type="infusion",
        dose="100 mL/hr",
        status="RUNNING",
        start_time=datetime.utcnow() - timedelta(hours=2),
        starting_quantity=1000.0,
        remaining_quantity=1000.0,
        infusion_rate=100.0,
        low_threshold=200.0
    )

    state = treatment_service.calculate_treatment_state(t)
    assert state["remaining_quantity"] <= 801.0
    assert state["remaining_quantity"] >= 799.0
    assert state["is_low"] is False
    assert state["is_replacement_required"] is False

    # Low state
    t_low = PatientTreatment(
        id=998,
        patient_id="P-TEST-TREAT",
        name="Normal Saline",
        type="infusion",
        dose="200 mL/hr",
        status="RUNNING",
        start_time=datetime.utcnow() - timedelta(hours=4.5),
        starting_quantity=1000.0,
        infusion_rate=200.0,
        low_threshold=200.0
    )
    state_low = treatment_service.calculate_treatment_state(t_low)
    assert state_low["remaining_quantity"] <= 105.0
    assert state_low["is_low"] is True

    # Replacement required state (<= 50 mL)
    t_critical = PatientTreatment(
        id=997,
        patient_id="P-TEST-TREAT",
        name="Normal Saline",
        type="infusion",
        dose="100 mL/hr",
        status="RUNNING",
        start_time=datetime.utcnow() - timedelta(hours=9.8),
        starting_quantity=1000.0,
        infusion_rate=100.0,
        low_threshold=200.0
    )
    state_crit = treatment_service.calculate_treatment_state(t_critical)
    assert state_crit["remaining_quantity"] <= 50.0
    assert state_crit["is_replacement_required"] is True
    assert state_crit["status"] == "REPLACEMENT REQUIRED"


def test_full_bed_assign_treatment_release_cleaning_flow():
    """Verify complete end-to-end bed lifecycle: Assign -> Order Treatment -> Release/Cleaning -> Complete Cleaning."""
    # 1. Create Patient
    p_data = {
        "patient_id": "TEST-BED-LIFE-001",
        "full_name": "Bed Lifecycle Test Patient",
        "dob": "1975-08-20",
        "age": 49,
        "gender": "M",
        "arrival_mode": "Ambulance",
        "chief_complaint": "Acute severe dyspnea and wheezing",
        "symptoms": "Dyspnea; Wheezing",
        "clinician_observations": "Tachypneic",
        "known_allergies": "None",
        "medical_history": "Asthma",
        "heart_rate": 105.0,
        "sbp": 135.0,
        "dbp": 85.0,
        "spo2": 93.0,
        "respiratory_rate": 22.0,
        "temperature_c": 37.1,
        "gcs": 15.0
    }
    client.post("/api/patients", json=p_data)

    # 2. Get initial available beds
    cap_before = client.get("/api/hospital/capacity").json()
    avail_beds = []
    for u in cap_before["units"]:
        for b in u["beds"]:
            if b["status"] == "available":
                avail_beds.append((b["bed_id"], u["unit_id"]))
    assert len(avail_beds) > 0
    target_bed_id, target_unit_id = avail_beds[0]

    # 3. Assign Patient to Bed
    assign_res = client.post("/api/beds/assign", json={
        "patient_id": p_data["patient_id"],
        "unit_id": target_unit_id,
        "bed_id": target_bed_id
    })
    assert assign_res.status_code == 200

    # Verify bed is occupied
    cap_after_assign = client.get("/api/hospital/capacity").json()
    bed_found = False
    for u in cap_after_assign["units"]:
        for b in u["beds"]:
            if b["bed_id"] == target_bed_id:
                assert b["status"] == "occupied"
                assert b["assigned_patient_id"] == p_data["patient_id"]
                bed_found = True
    assert bed_found is True

    # 4. Order Treatment for Patient
    treat_res = client.post(f"/api/treatments/patient/{p_data['patient_id']}", json={
        "patient_id": p_data["patient_id"],
        "name": "IV Methylprednisolone",
        "type": "medication",
        "dose": "125 mg IV",
        "route": "IV Push",
        "frequency": "Once",
        "status": "ACTIVE"
    })
    assert treat_res.status_code == 201
    assert treat_res.json()["name"] == "IV Methylprednisolone"

    # List treatments
    treat_list = client.get(f"/api/treatments/patient/{p_data['patient_id']}").json()
    assert treat_list["total"] >= 1

    # 5. Release Bed (Discharge) -> moves to Cleaning
    rel_res = client.post("/api/beds/release", json={
        "bed_id": target_bed_id,
        "patient_id": p_data["patient_id"],
        "cleaning_minutes": 10,
        "disposition": "discharged"
    })
    assert rel_res.status_code == 200
    assert rel_res.json()["status"] == "cleaning"

    # Verify bed is now cleaning
    cap_after_rel = client.get("/api/hospital/capacity").json()
    for u in cap_after_rel["units"]:
        for b in u["beds"]:
            if b["bed_id"] == target_bed_id:
                assert b["status"] == "cleaning"
                assert b.get("assigned_patient_id") is None

    # 6. Complete Cleaning -> moves to Available
    clean_res = client.post("/api/beds/complete-cleaning", json={
        "bed_id": target_bed_id
    })
    assert clean_res.status_code == 200
    assert clean_res.json()["status"] == "available"

    # Verify bed is now available again
    cap_after_clean = client.get("/api/hospital/capacity").json()
    for u in cap_after_clean["units"]:
        for b in u["beds"]:
            if b["bed_id"] == target_bed_id:
                assert b["status"] == "available"

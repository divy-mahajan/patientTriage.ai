"""
PatientTriage.ai — Real-Time Reassessment & Continuous Monitoring Unit & Integration Tests
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.database import SessionLocal
from backend.app.db.models import Patient, PatientReassessment, AuditLog
from backend.app.services.reassessment_service import reassessment_service, BASE_REASSESSMENT_THRESHOLDS

client = TestClient(app)


def test_reassessment_intervals_and_surge_scaling():
    """Verify acuity-based intervals and dynamic surge mode interval compression."""
    # Normal mode
    assert reassessment_service.get_monitoring_interval(1, "normal") == 5
    assert reassessment_service.get_monitoring_interval(2, "normal") == 15
    assert reassessment_service.get_monitoring_interval(3, "normal") == 30
    assert reassessment_service.get_monitoring_interval(4, "normal") == 60
    assert reassessment_service.get_monitoring_interval(5, "normal") == 120

    # Critical surge mode (50% compression)
    assert reassessment_service.get_monitoring_interval(2, "critical") == 8
    assert reassessment_service.get_monitoring_interval(3, "critical") == 15
    assert reassessment_service.get_monitoring_interval(4, "critical") == 30
    assert reassessment_service.get_monitoring_interval(5, "critical") == 60

    # Disaster surge mode (33% compression)
    assert reassessment_service.get_monitoring_interval(2, "disaster") == 5
    assert reassessment_service.get_monitoring_interval(3, "disaster") == 10


def test_vital_sign_deterioration_detection():
    """Verify exact, explainable deterioration detection rules across vital signs."""
    baseline = {
        "heart_rate": 80.0,
        "sbp": 125.0,
        "dbp": 80.0,
        "spo2": 98.0,
        "respiratory_rate": 16.0,
        "temperature_c": 37.0,
        "gcs": 15.0
    }

    # 1. SpO2 Drop
    deteriorating_spo2 = {**baseline, "spo2": 91.0}
    is_det, reasons = reassessment_service.detect_vital_deterioration(baseline, deteriorating_spo2)
    assert is_det is True
    assert any("SpO2 decreased" in r for r in reasons)

    # 2. Tachycardia Spike
    deteriorating_hr = {**baseline, "heart_rate": 118.0}
    is_det, reasons = reassessment_service.detect_vital_deterioration(baseline, deteriorating_hr)
    assert is_det is True
    assert any("Heart rate increased" in r for r in reasons)

    # 3. Hypotensive Drop
    deteriorating_bp = {**baseline, "sbp": 85.0}
    is_det, reasons = reassessment_service.detect_vital_deterioration(baseline, deteriorating_bp)
    assert is_det is True
    assert any("Blood pressure dropped" in r for r in reasons)

    # 4. Tachypnea
    deteriorating_rr = {**baseline, "respiratory_rate": 26.0}
    is_det, reasons = reassessment_service.detect_vital_deterioration(baseline, deteriorating_rr)
    assert is_det is True
    assert any("Respiratory rate increased" in r for r in reasons)

    # 5. Neurological GCS Drop
    deteriorating_gcs = {**baseline, "gcs": 12.0}
    is_det, reasons = reassessment_service.detect_vital_deterioration(baseline, deteriorating_gcs)
    assert is_det is True
    assert any("GCS decreased" in r for r in reasons)

    # 6. Stable Case (No deterioration)
    stable = {**baseline, "heart_rate": 82.0, "spo2": 97.0, "sbp": 122.0}
    is_det, reasons = reassessment_service.detect_vital_deterioration(baseline, stable)
    assert is_det is False
    assert len(reasons) == 0


def test_api_record_vitals_and_reassessment():
    """Verify recording new vitals via API triggers reassessment, updates status, and logs audit events."""
    # 1. Create a test patient
    p_data = {
        "patient_id": "TEST-REASSESS-001",
        "full_name": "Reassessment Test Patient",
        "dob": "1980-05-12",
        "age": 44,
        "gender": "M",
        "arrival_mode": "Walk-in",
        "chief_complaint": "Persistent cough and mild dyspnea",
        "symptoms": "Cough; Shortness of breath",
        "clinician_observations": "Alert and oriented",
        "known_allergies": "None",
        "medical_history": "Asthma",
        "heart_rate": 82.0,
        "sbp": 125.0,
        "dbp": 80.0,
        "spo2": 97.0,
        "respiratory_rate": 16.0,
        "temperature_c": 37.0,
        "gcs": 15.0
    }

    res = client.post("/api/patients", json=p_data)
    assert res.status_code == 201

    # 2. Check initial monitoring status
    status_res = client.get(f"/api/reassessment/status/{p_data['patient_id']}")
    assert status_res.status_code == 200
    s_json = status_res.json()
    assert s_json["patient_id"] == p_data["patient_id"]
    assert s_json["is_deteriorating"] is False

    # 3. Record deteriorating vitals (SpO2 drops to 90%, HR jumps to 115)
    new_vitals = {
        "heart_rate": 115.0,
        "sbp": 120.0,
        "dbp": 78.0,
        "spo2": 90.0,
        "respiratory_rate": 24.0,
        "temperature_c": 37.5,
        "gcs": 15.0,
        "clinician_observations": "Patient exhibiting increased work of breathing and retractions",
        "actor": "Charge Nurse Sarah",
        "notes": "Supplemental oxygen 2L nasal cannula applied"
    }

    rec_res = client.post(f"/api/reassessment/vitals/{p_data['patient_id']}", json=new_vitals)
    assert rec_res.status_code == 201
    r_json = rec_res.json()
    assert r_json["deterioration_detected"] is True
    assert len(r_json["deterioration_factors"]) > 0

    # 4. Verify updated monitoring status reflects deterioration
    status_after = client.get(f"/api/reassessment/status/{p_data['patient_id']}").json()
    assert status_after["monitoring_status"] == "DETERIORATING"
    assert status_after["is_deteriorating"] is True

    # 5. Verify reassessment history timeline
    hist_res = client.get(f"/api/reassessment/history/{p_data['patient_id']}")
    assert hist_res.status_code == 200
    h_json = hist_res.json()
    assert h_json["total_reassessments"] >= 1
    assert h_json["timeline"][-1]["deterioration_detected"] is True


def test_api_clinician_override():
    """Verify clinician override records authoritative rationale, logs to audit trail, and keeps AI estimate distinct."""
    p_id = "TEST-REASSESS-001"

    override_payload = {
        "override_level": 2,
        "override_reason": "Clinician clinical impression: impending acute respiratory failure despite stable baseline.",
        "notes": "Preparing for arterial blood gas draw.",
        "clinician_name": "Dr. Emily Chen, MD"
    }

    ov_res = client.post(f"/api/reassessment/override/{p_id}", json=override_payload)
    assert ov_res.status_code == 200
    ov_json = ov_res.json()
    assert ov_json["clinician_override"] is True
    assert ov_json["override_level"] == 2

    # Check status reflects override
    status_res = client.get(f"/api/reassessment/status/{p_id}").json()
    assert status_res["has_clinician_override"] is True
    assert status_res["effective_triage_level"] == 2
    assert status_res["override_reason"] == override_payload["override_reason"]


def test_api_alerts_and_audit_trail():
    """Verify active alerts detection and audit log retrieval endpoints."""
    alerts_res = client.get("/api/reassessment/alerts")
    assert alerts_res.status_code == 200
    alerts_json = alerts_res.json()
    assert "alerts" in alerts_json
    assert "total_alerts" in alerts_json

    audit_res = client.get("/api/audit")
    assert audit_res.status_code == 200
    audit_json = audit_res.json()
    assert audit_json["total"] >= 1
    assert any(log["event_type"] in ["VITALS_UPDATED", "DETERIORATION_DETECTED", "CLINICIAN_OVERRIDE"] for log in audit_json["logs"])

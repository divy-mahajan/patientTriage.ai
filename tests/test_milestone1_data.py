"""
PatientTriage.ai — Milestone 1 Validation & Test Suite

Validates:
1. Hospital Profile JSON Schema and Demo Profiles (St. Mary's General & Metro Trauma Center)
2. Diagnostic Rules Matrix (Rule-based Test Suggestion Table)
3. Synthetic Patient Dataset (Vitals realism, ESI distribution, reproducibility, bounds)
4. Synthetic Doctor Roster (Caseloads, specialties, shift statuses)
5. Hospital Capacity Snapshots
"""

import json
import os
import csv
import pandas as pd
import pytest

CONFIG_DIR = os.path.join(os.path.dirname(__file__), "..", "config")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "synthetic")
GENERATOR_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "generator")


# ==============================================================================
# 1. Hospital Profile Tests
# ==============================================================================

def test_st_marys_profile_exists_and_valid():
    """Verify St. Mary's General profile exists and contains required fields."""
    profile_path = os.path.join(CONFIG_DIR, "hospital_profiles", "st_marys_general.json")
    assert os.path.exists(profile_path), f"Missing profile at {profile_path}"
    
    with open(profile_path, "r", encoding="utf-8") as f:
        profile = json.load(f)

    assert profile["hospital_id"] == "st_marys_general"
    assert "summary" in profile
    assert "units" in profile
    assert len(profile["units"]) == 5  # Resuscitation, Emergency, Cardiology, Observation, General Med


def test_st_marys_bed_arithmetic_consistency():
    """Verify that summary bed counts match exact sum of individual beds in all units."""
    profile_path = os.path.join(CONFIG_DIR, "hospital_profiles", "st_marys_general.json")
    with open(profile_path, "r", encoding="utf-8") as f:
        profile = json.load(f)

    summary = profile["summary"]
    total_individual_beds = 0
    actual_available = 0
    actual_occupied = 0
    actual_cleaning = 0
    actual_reserved = 0
    actual_unavailable = 0

    valid_statuses = {"available", "occupied", "cleaning", "reserved", "unavailable"}

    for unit in profile["units"]:
        unit_beds = unit["beds"]
        assert len(unit_beds) == unit["total_beds"], f"Unit {unit['unit_id']} bed count mismatch"
        total_individual_beds += len(unit_beds)

        for bed in unit_beds:
            status = bed["status"]
            assert status in valid_statuses, f"Invalid bed status: {status}"
            assert len(bed["equipment"]) > 0, f"Bed {bed['bed_id']} has no equipment capabilities"

            if status == "available":
                actual_available += 1
            elif status == "occupied":
                actual_occupied += 1
            elif status == "cleaning":
                actual_cleaning += 1
            elif status == "reserved":
                actual_reserved += 1
            elif status == "unavailable":
                actual_unavailable += 1

    assert summary["total_beds"] == total_individual_beds == 24
    assert summary["available_beds"] == actual_available == 8
    assert summary["occupied_beds"] == actual_occupied == 11
    assert summary["cleaning_beds"] == actual_cleaning == 3
    assert summary["reserved_beds"] == actual_reserved == 1
    assert summary["unavailable_beds"] == actual_unavailable == 1


def test_metro_trauma_profile_swappability():
    """Verify secondary hospital profile exists and satisfies full structural consistency."""
    profile_path = os.path.join(CONFIG_DIR, "hospital_profiles", "metro_trauma_center.json")
    assert os.path.exists(profile_path)
    
    with open(profile_path, "r", encoding="utf-8") as f:
        profile = json.load(f)

    assert profile["hospital_id"] == "metro_trauma_center"
    summary = profile["summary"]
    
    counted_beds = sum(len(u["beds"]) for u in profile["units"])
    assert summary["total_beds"] == counted_beds == 36


# ==============================================================================
# 2. Diagnostic Rules Matrix Tests
# ==============================================================================

def test_test_rules_matrix_structure():
    """Verify diagnostic test rules matrix is valid and contains standard panels."""
    rules_path = os.path.join(CONFIG_DIR, "test_rules_matrix.json")
    assert os.path.exists(rules_path)
    
    with open(rules_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "rules" in data
    assert len(data["rules"]) >= 6

    complaint_names = [r["complaint_category"] for r in data["rules"]]
    assert any("Chest Pain" in name for name in complaint_names)
    assert any("Shortness of Breath" in name for name in complaint_names)
    assert any("Altered Mental Status" in name for name in complaint_names)
    assert any("Abdominal Pain" in name for name in complaint_names)

    for rule in data["rules"]:
        assert len(rule["keywords"]) > 0
        assert len(rule["suggested_tests"]) > 0
        for test in rule["suggested_tests"]:
            assert "code" in test
            assert "name" in test
            assert "urgency" in test


# ==============================================================================
# 3. Synthetic Patient Dataset Tests
# ==============================================================================

def test_synthetic_patients_csv_exists_and_complete():
    """Verify synthetic patient CSV exists, is non-empty, and has all expected columns."""
    csv_path = os.path.join(DATA_DIR, "patients_synthetic.csv")
    assert os.path.exists(csv_path), f"Missing synthetic patient dataset at {csv_path}"

    df = pd.read_csv(csv_path)
    assert len(df) >= 500, f"Expected at least 500 records, got {len(df)}"

    expected_cols = [
        "patient_id", "full_name", "dob", "age", "gender", "arrival_mode", "arrival_timestamp",
        "chief_complaint", "symptoms", "clinician_observations", "known_allergies", "medical_history",
        "heart_rate", "sbp", "dbp", "spo2", "respiratory_rate", "temperature_c", "gcs",
        "synthetic_esi_level", "synthetic_risk_score", "is_high_risk", "recommended_bed_unit",
        "key_explainability_factors"
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column: {col}"
        assert df[col].isnull().sum() == 0, f"Column {col} contains null values"


def test_synthetic_patient_vital_sign_physiological_bounds():
    """Verify that vital signs fall within realistic physiological bounds."""
    csv_path = os.path.join(DATA_DIR, "patients_synthetic.csv")
    df = pd.read_csv(csv_path)

    # HR: 0 - 250 bpm
    assert (df["heart_rate"] >= 0).all() and (df["heart_rate"] <= 250).all()
    # SBP: 40 - 260 mmHg
    assert (df["sbp"] >= 40).all() and (df["sbp"] <= 260).all()
    # DBP: 20 - 150 mmHg
    assert (df["dbp"] >= 20).all() and (df["dbp"] <= 150).all()
    # SBP should generally exceed DBP
    assert (df["sbp"] > df["dbp"]).all()
    # SpO2: 50 - 100%
    assert (df["spo2"] >= 50).all() and (df["spo2"] <= 100).all()
    # RR: 4 - 60 breaths/min
    assert (df["respiratory_rate"] >= 4).all() and (df["respiratory_rate"] <= 60).all()
    # Temp: 32.0 - 42.0 C
    assert (df["temperature_c"] >= 32.0).all() and (df["temperature_c"] <= 42.0).all()
    # GCS: 3 - 15
    assert (df["gcs"] >= 3).all() and (df["gcs"] <= 15).all()


def test_synthetic_esi_distribution_and_risk_scores():
    """Verify all 5 synthetic ESI levels exist and risk score correlations."""
    csv_path = os.path.join(DATA_DIR, "patients_synthetic.csv")
    df = pd.read_csv(csv_path)

    esi_counts = df["synthetic_esi_level"].value_counts().to_dict()
    assert set(esi_counts.keys()) == {1, 2, 3, 4, 5}, "All 5 ESI levels must be present"

    # ESI 1 and 2 must be marked is_high_risk = True
    high_risk_esis = df[df["is_high_risk"] == True]["synthetic_esi_level"].unique()
    assert set(high_risk_esis).issubset({1, 2})

    low_risk_esis = df[df["is_high_risk"] == False]["synthetic_esi_level"].unique()
    assert set(low_risk_esis).issubset({3, 4, 5})

    # Risk score bounds: 0 to 100
    assert (df["synthetic_risk_score"] >= 0.0).all() and (df["synthetic_risk_score"] <= 100.0).all()

    # Average risk score of ESI 1 > ESI 2 > ESI 3 > ESI 4 > ESI 5
    grouped_risk = df.groupby("synthetic_esi_level")["synthetic_risk_score"].mean()
    assert grouped_risk[1] > grouped_risk[2] > grouped_risk[3] > grouped_risk[4] > grouped_risk[5]


def test_generator_reproducibility():
    """Verify that running the generator with the same seed produces exact identical outputs."""
    import sys
    sys.path.insert(0, GENERATOR_DIR)
    from generate_patients import generate_dataset

    data1 = generate_dataset(num_records=50, seed=123, output_path="data/synthetic/_temp_test1.csv")
    data2 = generate_dataset(num_records=50, seed=123, output_path="data/synthetic/_temp_test2.csv")

    assert data1 == data2, "Generator must be strictly deterministic with identical seeds"

    # Cleanup temp test files
    if os.path.exists("data/synthetic/_temp_test1.csv"):
        os.remove("data/synthetic/_temp_test1.csv")
    if os.path.exists("data/synthetic/_temp_test2.csv"):
        os.remove("data/synthetic/_temp_test2.csv")


# ==============================================================================
# 4. Doctor Roster & Hospital Capacity Tests
# ==============================================================================

def test_doctors_roster_validity():
    """Verify synthetic doctor roster schema, specialties, and caseload limits."""
    roster_path = os.path.join(DATA_DIR, "doctors_roster.csv")
    assert os.path.exists(roster_path)

    df = pd.read_csv(roster_path)
    assert len(df) >= 6

    for _, row in df.iterrows():
        assert row["current_caseload"] <= row["max_caseload"]
        assert row["shift_status"] in {"Active Shift", "On Break", "Off Duty"}
        if row["shift_status"] == "Active Shift" and row["current_caseload"] < row["max_caseload"]:
            assert row["is_available"] == True or row["is_available"] == "True"


def test_capacity_snapshots_validity():
    """Verify capacity snapshots JSON has valid structures."""
    snap_path = os.path.join(DATA_DIR, "hospital_capacity_snapshots.json")
    assert os.path.exists(snap_path)

    with open(snap_path, "r", encoding="utf-8") as f:
        snapshots = json.load(f)

    assert len(snapshots) >= 3
    for snap in snapshots:
        assert "snapshot_id" in snap
        assert "waiting_room" in snap
        assert "beds_summary" in snap
        assert "unit_breakdown" in snap
        assert "surge_status" in snap

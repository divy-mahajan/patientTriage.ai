#!/usr/bin/env python3
"""
PatientTriage.ai — Master Synthetic Data Generation Pipeline

Generates all synthetic datasets for Milestone 1:
1. Synthetic patient cohort CSV
2. Synthetic doctor roster CSV
3. Synthetic hospital capacity snapshots JSON
"""

import argparse
import json
import os
from generate_patients import generate_dataset
from generate_doctors import generate_doctor_roster

CAPACITY_SNAPSHOTS = [
    {
        "snapshot_id": "SNAP-001",
        "snapshot_name": "Morning Normal Flow",
        "timestamp": "2026-08-25T08:00:00Z",
        "hospital_id": "st_marys_general",
        "waiting_room": {
            "capacity": 45,
            "current_occupancy": 12,
            "occupancy_rate": 0.27,
            "estimated_wait_minutes": 15
        },
        "beds_summary": {
            "total_beds": 24,
            "available_beds": 14,
            "occupied_beds": 8,
            "cleaning_beds": 2,
            "reserved_beds": 0,
            "unavailable_beds": 0
        },
        "unit_breakdown": {
            "resuscitation": {"total": 3, "available": 2, "occupied": 1},
            "emergency": {"total": 5, "available": 3, "occupied": 2},
            "cardiology": {"total": 4, "available": 2, "occupied": 2},
            "observation": {"total": 6, "available": 4, "occupied": 2},
            "general_medicine": {"total": 6, "available": 3, "occupied": 1}
        },
        "staffing": {
            "doctors_active": 4,
            "nurses_active": 12,
            "average_doctor_caseload": 2.0
        },
        "surge_status": "NORMAL"
    },
    {
        "snapshot_id": "SNAP-002",
        "snapshot_name": "Afternoon Peak Volume (Current Live State)",
        "timestamp": "2026-08-25T16:00:00Z",
        "hospital_id": "st_marys_general",
        "waiting_room": {
            "capacity": 45,
            "current_occupancy": 27,
            "occupancy_rate": 0.60,
            "estimated_wait_minutes": 42
        },
        "beds_summary": {
            "total_beds": 24,
            "available_beds": 8,
            "occupied_beds": 11,
            "cleaning_beds": 3,
            "reserved_beds": 1,
            "unavailable_beds": 1
        },
        "unit_breakdown": {
            "resuscitation": {"total": 3, "available": 1, "occupied": 1, "unavailable": 1},
            "emergency": {"total": 5, "available": 1, "occupied": 3, "cleaning": 1},
            "cardiology": {"total": 4, "available": 1, "occupied": 2, "reserved": 1},
            "observation": {"total": 6, "available": 3, "occupied": 3},
            "general_medicine": {"total": 6, "available": 2, "occupied": 2, "cleaning": 2}
        },
        "staffing": {
            "doctors_active": 5,
            "nurses_active": 14,
            "average_doctor_caseload": 4.2
        },
        "surge_status": "NORMAL"
    },
    {
        "snapshot_id": "SNAP-003",
        "snapshot_name": "Evening Surge (Multi-Vehicle Incident Scenario)",
        "timestamp": "2026-08-25T20:30:00Z",
        "hospital_id": "st_marys_general",
        "waiting_room": {
            "capacity": 45,
            "current_occupancy": 41,
            "occupancy_rate": 0.91,
            "estimated_wait_minutes": 95
        },
        "beds_summary": {
            "total_beds": 24,
            "available_beds": 2,
            "occupied_beds": 19,
            "cleaning_beds": 2,
            "reserved_beds": 1,
            "unavailable_beds": 0
        },
        "unit_breakdown": {
            "resuscitation": {"total": 3, "available": 0, "occupied": 3},
            "emergency": {"total": 5, "available": 0, "occupied": 5},
            "cardiology": {"total": 4, "available": 0, "occupied": 3, "reserved": 1},
            "observation": {"total": 6, "available": 1, "occupied": 4, "cleaning": 1},
            "general_medicine": {"total": 6, "available": 1, "occupied": 4, "cleaning": 1}
        },
        "staffing": {
            "doctors_active": 5,
            "nurses_active": 15,
            "average_doctor_caseload": 5.8
        },
        "surge_status": "SURGE_ACTIVE"
    },
    {
        "snapshot_id": "SNAP-004",
        "snapshot_name": "Night Shift Low Volume",
        "timestamp": "2026-08-26T03:30:00Z",
        "hospital_id": "st_marys_general",
        "waiting_room": {
            "capacity": 45,
            "current_occupancy": 6,
            "occupancy_rate": 0.13,
            "estimated_wait_minutes": 10
        },
        "beds_summary": {
            "total_beds": 24,
            "available_beds": 16,
            "occupied_beds": 7,
            "cleaning_beds": 1,
            "reserved_beds": 0,
            "unavailable_beds": 0
        },
        "unit_breakdown": {
            "resuscitation": {"total": 3, "available": 2, "occupied": 1},
            "emergency": {"total": 5, "available": 4, "occupied": 1},
            "cardiology": {"total": 4, "available": 2, "occupied": 2},
            "observation": {"total": 6, "available": 4, "occupied": 2},
            "general_medicine": {"total": 6, "available": 4, "occupied": 1, "cleaning": 1}
        },
        "staffing": {
            "doctors_active": 2,
            "nurses_active": 8,
            "average_doctor_caseload": 3.5
        },
        "surge_status": "NORMAL"
    }
]


def generate_capacity_snapshots(output_path: str = "data/synthetic/hospital_capacity_snapshots.json"):
    """Write capacity snapshots JSON."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(CAPACITY_SNAPSHOTS, f, indent=2)
    print(f"[SUCCESS] Generated {len(CAPACITY_SNAPSHOTS)} capacity snapshots saved to: {output_path}")
    return CAPACITY_SNAPSHOTS


def run_all(patient_count: int = 500, seed: int = 42):
    """Execute complete generation pipeline."""
    print("=" * 60)
    print("PatientTriage.ai — Milestone 1 Synthetic Data Pipeline")
    print("=" * 60)
    generate_dataset(num_records=patient_count, seed=seed)
    generate_doctor_roster()
    generate_capacity_snapshots()
    print("=" * 60)
    print("[ALL COMPLETE] Milestone 1 synthetic dataset and configurations ready.")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Master synthetic data generator")
    parser.add_argument("--count", type=int, default=500, help="Number of synthetic patients")
    parser.add_argument("--seed", type=int, default=42, help="Seed for reproducibility")
    args = parser.parse_args()

    run_all(patient_count=args.count, seed=args.seed)

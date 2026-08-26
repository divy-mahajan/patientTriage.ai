#!/usr/bin/env python3
"""
PatientTriage.ai — Synthetic Doctor Roster Generator

CLINICAL DISCLAIMER:
This script generates purely synthetic doctor roster data for prototype design,
shift management demonstration, and caseload matching validation.
"""

import argparse
import random
import csv
import os

DOCTOR_PROFILES = [
    {
        "doctor_id": "DOC-001",
        "name": "Dr. Arjun Mehta",
        "specialty": "Emergency Medicine",
        "shift_status": "Active Shift",
        "current_caseload": 4,
        "max_caseload": 6,
        "is_available": True,
        "shift_start": "07:00",
        "shift_end": "19:00",
        "active_patients": "P-10470; P-10482",
        "avatar_url": "/avatars/dr_mehta.jpg"
    },
    {
        "doctor_id": "DOC-002",
        "name": "Dr. Robert Chen",
        "specialty": "Trauma Surgery",
        "shift_status": "Active Shift",
        "current_caseload": 5,
        "max_caseload": 7,
        "is_available": True,
        "shift_start": "07:00",
        "shift_end": "19:00",
        "active_patients": "P-10475; P-10479",
        "avatar_url": "/avatars/dr_chen.jpg"
    },
    {
        "doctor_id": "DOC-003",
        "name": "Dr. Sarah O'Connor",
        "specialty": "Internal Medicine",
        "shift_status": "Active Shift",
        "current_caseload": 6,
        "max_caseload": 6,
        "is_available": False,
        "shift_start": "08:00",
        "shift_end": "20:00",
        "active_patients": "P-10471; P-10478; P-10480",
        "avatar_url": "/avatars/dr_oconnor.jpg"
    },
    {
        "doctor_id": "DOC-004",
        "name": "Dr. Marcus Washington",
        "specialty": "Cardiology",
        "shift_status": "Active Shift",
        "current_caseload": 3,
        "max_caseload": 5,
        "is_available": True,
        "shift_start": "09:00",
        "shift_end": "21:00",
        "active_patients": "P-10468; P-10472",
        "avatar_url": "/avatars/dr_washington.jpg"
    },
    {
        "doctor_id": "DOC-005",
        "name": "Dr. Priya Shah",
        "specialty": "Pediatrics & Emergency",
        "shift_status": "Active Shift",
        "current_caseload": 3,
        "max_caseload": 6,
        "is_available": True,
        "shift_start": "11:00",
        "shift_end": "23:00",
        "active_patients": "P-10465; P-10474; P-10476",
        "avatar_url": "/avatars/dr_shah.jpg"
    },
    {
        "doctor_id": "DOC-006",
        "name": "Dr. Elena Rostova",
        "specialty": "Critical Care / ICU",
        "shift_status": "On Break",
        "current_caseload": 2,
        "max_caseload": 5,
        "is_available": False,
        "shift_start": "07:00",
        "shift_end": "19:00",
        "active_patients": "",
        "avatar_url": "/avatars/dr_rostova.jpg"
    },
    {
        "doctor_id": "DOC-007",
        "name": "Dr. David Kim",
        "specialty": "Emergency Medicine",
        "shift_status": "Off Duty",
        "current_caseload": 0,
        "max_caseload": 6,
        "is_available": False,
        "shift_start": "19:00",
        "shift_end": "07:00",
        "active_patients": "",
        "avatar_url": "/avatars/dr_kim.jpg"
    },
    {
        "doctor_id": "DOC-008",
        "name": "Dr. Jessica Alverez",
        "specialty": "Emergency Medicine",
        "shift_status": "Off Duty",
        "current_caseload": 0,
        "max_caseload": 6,
        "is_available": False,
        "shift_start": "19:00",
        "shift_end": "07:00",
        "active_patients": "",
        "avatar_url": "/avatars/dr_alverez.jpg"
    }
]


def generate_doctor_roster(output_path: str = "data/synthetic/doctors_roster.csv"):
    """Write synthetic physician roster to CSV."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fieldnames = [
        "doctor_id", "name", "specialty", "shift_status", "current_caseload",
        "max_caseload", "is_available", "shift_start", "shift_end",
        "active_patients", "avatar_url"
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(DOCTOR_PROFILES)

    print(f"[SUCCESS] Generated {len(DOCTOR_PROFILES)} synthetic doctor roster records saved to: {output_path}")
    return DOCTOR_PROFILES


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic doctor roster for PatientTriage.ai")
    parser.add_argument("--output", type=str, default="data/synthetic/doctors_roster.csv", help="Output CSV path")
    args = parser.parse_args()
    
    generate_doctor_roster(output_path=args.output)

#!/usr/bin/env python3
"""
PatientTriage.ai — Synthetic Patient Dataset Generator

CLINICAL DISCLAIMER:
This script generates purely synthetic patient data for prototype design,
software architecture validation, and machine learning demonstration.
It is NOT clinically validated or intended for actual medical decision-making.
"""

import argparse
import random
import csv
import os
from datetime import datetime, timedelta

FIRST_NAMES_MALE = [
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
    "Thomas", "Charles", "Arjun", "Ravi", "Aarav", "Dev", "Carlos", "Mateo", "Wei", "Chen"
]

FIRST_NAMES_FEMALE = [
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica",
    "Sarah", "Karen", "Priya", "Ananya", "Meera", "Diya", "Sofia", "Camila", "Mei", "Ling"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Sharma", "Patel", "Mehta", "Rao", "Das", "Gupta", "Verma", "Chen", "Wang", "Zhang"
]

ALLERGIES_LIST = [
    "Penicillin", "Sulfa drugs", "Aspirin", "Ibuprofen", "Codeine", "Latex",
    "Iodine contrast", "Morphine", "ACE inhibitors", "None known"
]

COMORBIDITIES_LIST = [
    "Hypertension", "Type 2 Diabetes", "Coronary Artery Disease", "COPD", "Asthma",
    "Chronic Kidney Disease", "Atrial Fibrillation", "Heart Failure", "Hyperlipidemia",
    "History of Stroke", "Immunocompromised", "None"
]

ARRIVAL_MODES = ["Walk-in", "Ambulance (EMS)", "Private Vehicle", "Helicopter (Air Ambulance)"]


def generate_single_patient(patient_num: int, target_esi: int, base_time: datetime, rng: random.Random) -> dict:
    """Generate one synthetic patient record with vitals calibrated to a target ESI level."""
    gender = rng.choice(["M", "F"])
    first_name = rng.choice(FIRST_NAMES_MALE if gender == "M" else FIRST_NAMES_FEMALE)
    last_name = rng.choice(LAST_NAMES)
    full_name = f"{last_name}, {first_name}"
    
    # Age distribution based on acuity
    if target_esi == 1:
        age = rng.choice([rng.randint(45, 88), rng.randint(20, 45), rng.randint(60, 92)])
    elif target_esi == 2:
        age = rng.choice([rng.randint(35, 85), rng.randint(50, 90), rng.randint(18, 40)])
    elif target_esi == 3:
        age = rng.randint(16, 82)
    elif target_esi == 4:
        age = rng.randint(8, 70)
    else: # 5
        age = rng.randint(5, 65)

    birth_date = base_time.date() - timedelta(days=int(age * 365.25) + rng.randint(0, 360))
    dob_str = birth_date.strftime("%Y-%m-%d")

    # Time delta
    arrival_time = base_time - timedelta(minutes=patient_num * rng.randint(3, 12))
    arrival_str = arrival_time.strftime("%Y-%m-%d %H:%M:%S")

    # Allergies & Comorbidities
    if rng.random() < 0.35:
        num_allergies = rng.randint(1, 2)
        allergies = rng.sample([a for a in ALLERGIES_LIST if a != "None known"], num_allergies)
    else:
        allergies = ["None known"]

    if target_esi in [1, 2]:
        comorb_count = rng.randint(1, 3)
        comorbs = rng.sample([c for c in COMORBIDITIES_LIST if c != "None"], comorb_count)
    elif target_esi == 3:
        comorb_count = rng.randint(0, 2)
        comorbs = rng.sample(COMORBIDITIES_LIST, comorb_count) if comorb_count > 0 else ["None"]
    else:
        comorbs = ["None"] if rng.random() < 0.7 else [rng.choice(COMORBIDITIES_LIST)]

    # Acuity-specific profile generation
    explain_factors = []
    
    if target_esi == 1: # Resuscitation
        arrival_mode = rng.choice(["Ambulance (EMS)", "Ambulance (EMS)", "Helicopter (Air Ambulance)"])
        complaints_pool = [
            ("Cardiac arrest with CPR in progress", ["Unresponsive", "No pulse"], ["Cyanotic", "Pupils fixed", "Agonal breathing"]),
            ("Massive hemoptysis and severe respiratory failure", ["Hemoptysis", "Stridor", "Asphyxiation"], ["Labored Breathing", "Cyanotic", "Severe agitation"]),
            ("Major polytrauma with profound hemorrhagic shock", ["Blunt trauma", "Massive hemorrhage", "Hypothermia"], ["Pale / Diaphoretic", "Unresponsive", "Weak thready pulse"]),
            ("Anaphylactic shock with severe airway compromise", ["Stridor", "Angioedema", "Hypotension"], ["Labored Breathing", "Cyanotic", "Lethargic"]),
            ("Severe traumatic brain injury post-motor vehicle collision", ["Head trauma", "Unconscious", "Decerebrate posturing"], ["Unresponsive", "Irregular respirations"])
        ]
        scenario = rng.choice(complaints_pool)
        chief_complaint = scenario[0]
        symptoms = scenario[1]
        observations = scenario[2]

        heart_rate = rng.choice([rng.randint(145, 190), rng.randint(25, 42), rng.randint(160, 210)])
        sbp = rng.randint(45, 78)
        dbp = max(20, sbp - rng.randint(20, 35))
        spo2 = rng.randint(62, 83)
        rr = rng.choice([rng.randint(36, 48), rng.randint(4, 8)])
        temp_c = round(rng.uniform(34.2, 39.8), 1)
        gcs = rng.randint(3, 8)
        risk_score = round(rng.uniform(92.0, 99.8), 1)
        is_high_risk = True
        recommended_bed = "Resuscitation Bay"

        explain_factors.append(f"GCS profoundly depressed ({gcs}/15)")
        explain_factors.append(f"Severe hypotension (SBP {sbp} mmHg)")
        explain_factors.append(f"Critical hypoxia (SpO2 {spo2}%)")
        if heart_rate > 140:
            explain_factors.append(f"Extreme tachycardia (HR {heart_rate} bpm)")
        elif heart_rate < 50:
            explain_factors.append(f"Severe bradycardia (HR {heart_rate} bpm)")

    elif target_esi == 2: # Emergent
        arrival_mode = rng.choice(["Ambulance (EMS)", "Ambulance (EMS)", "Walk-in", "Private Vehicle"])
        complaints_pool = [
            ("Severe substernal chest pain radiating to left arm", ["Chest Pain", "Shortness of Breath", "Diaphoresis"], ["Pale / Diaphoretic", "Severe distress"]),
            ("Acute onset right-sided hemiplegia and slurred speech", ["Facial droop", "Hemiparesis", "Dysarthria"], ["Confused", "Lethargic"]),
            ("Acute severe asthma exacerbation not responding to inhaler", ["Severe dyspnea", "Wheezing", "Chest tightness"], ["Labored Breathing", "Tripod positioning"]),
            ("Severe sepsis secondary to pyelonephritis", ["High fever", "Chills", "Altered mental state", "Flank pain"], ["Lethargic", "Pale / Diaphoretic", "Febrile"]),
            ("Upper gastrointestinal bleeding with syncope", ["Hematemesis", "Melena", "Dizziness", "Orthostasis"], ["Pale / Diaphoretic", "Weakness", "Lethargic"])
        ]
        scenario = rng.choice(complaints_pool)
        chief_complaint = scenario[0]
        symptoms = scenario[1]
        observations = scenario[2]

        heart_rate = rng.choice([rng.randint(112, 142), rng.randint(42, 52)])
        if rng.random() < 0.5:
            # Hypotensive emergent presentation
            sbp = rng.randint(78, 94)
            dbp = max(35, sbp - rng.randint(22, 38))
        else:
            # Hypertensive emergency presentation
            sbp = rng.randint(185, 230)
            dbp = rng.randint(95, min(125, sbp - 35))
        spo2 = rng.randint(84, 91) if "asthma" in chief_complaint.lower() or "chest" in chief_complaint.lower() else rng.randint(90, 94)
        rr = rng.randint(24, 34)
        temp_c = round(rng.uniform(37.8, 40.1) if "sepsis" in chief_complaint.lower() else rng.uniform(36.4, 38.2), 1)
        gcs = rng.randint(10, 14)
        risk_score = round(rng.uniform(75.0, 91.5), 1)
        is_high_risk = True
        recommended_bed = "Cardiology Wing" if "chest" in chief_complaint.lower() else "Emergency Department"

        if spo2 < 92:
            explain_factors.append(f"SpO2 below range ({spo2}%)")
        if heart_rate > 110:
            explain_factors.append(f"Elevated heart rate ({heart_rate} bpm)")
        if sbp < 95 or sbp > 180:
            explain_factors.append(f"Unstable blood pressure ({sbp}/{dbp} mmHg)")
        if gcs < 15:
            explain_factors.append(f"Altered mental status (GCS {gcs})")
        explain_factors.append(f"High-acuity symptom cluster ({symptoms[0]})")

    elif target_esi == 3: # Urgent
        arrival_mode = rng.choice(["Walk-in", "Walk-in", "Private Vehicle", "Ambulance (EMS)"])
        complaints_pool = [
            ("Severe right lower quadrant abdominal pain with nausea", ["Abdominal Pain", "Nausea", "Low grade fever"], ["Guarding", "Moderate distress"]),
            ("Moderate asthma flare-up with mild wheezing", ["Shortness of Breath", "Cough"], ["Mild tachypnea", "Clear speech"]),
            ("Suspected distal radius closed fracture after mechanical fall", ["Wrist deformity", "Severe localized pain"], ["Distressed by pain", "Alert"]),
            ("Acute renal colic with hematuria and vomiting", ["Flank pain", "Nausea", "Hematuria"], ["Restless due to pain", "Diaphoretic"]),
            ("Persistent high fever and productive cough for 4 days", ["Fever", "Cough", "Myalgias"], ["Warm to touch", "Fatigued"])
        ]
        scenario = rng.choice(complaints_pool)
        chief_complaint = scenario[0]
        symptoms = scenario[1]
        observations = scenario[2]

        heart_rate = rng.randint(84, 110)
        sbp = rng.randint(105, 148)
        dbp = max(50, min(rng.randint(65, 92), sbp - 20))
        spo2 = rng.randint(93, 97)
        rr = rng.randint(18, 24)
        temp_c = round(rng.uniform(36.8, 38.9), 1)
        gcs = 15
        risk_score = round(rng.uniform(42.0, 72.0), 1)
        is_high_risk = False
        recommended_bed = "Observation Unit" if "fever" in chief_complaint.lower() or "asthma" in chief_complaint.lower() else "Emergency Department"

        explain_factors.append("Multiple diagnostic resources required (Labs + Imaging)")
        if temp_c >= 38.3:
            explain_factors.append(f"Fever detected ({temp_c}°C)")
        if heart_rate >= 100:
            explain_factors.append(f"Borderline tachycardia ({heart_rate} bpm)")
        explain_factors.append("Stable vital signs baseline")

    elif target_esi == 4: # Less Urgent
        arrival_mode = rng.choice(["Walk-in", "Walk-in", "Private Vehicle"])
        complaints_pool = [
            ("Laceration to left forearm from broken glass, bleeding controlled", ["Laceration", "Localized pain"], ["Calm", "Alert"]),
            ("Twisted right ankle while playing basketball, able to bear partial weight", ["Ankle swelling", "Pain with movement"], ["Ambulatory with limp"]),
            ("Foreign body sensation in left eye with mild tearing", ["Eye irritation", "Photophobia"], ["Normal vital signs"]),
            ("Mild allergic rash on arms after contact with garden plant", ["Pruritus", "Erythema"], ["Comfortable", "No airway distress"]),
            ("Dysuria and urinary frequency without fever or flank pain", ["Dysuria", "Frequency"], ["Alert", "Non-toxic"])
        ]
        scenario = rng.choice(complaints_pool)
        chief_complaint = scenario[0]
        symptoms = scenario[1]
        observations = scenario[2]

        heart_rate = rng.randint(62, 88)
        sbp = rng.randint(110, 138)
        dbp = max(55, min(rng.randint(68, 86), sbp - 20))
        spo2 = rng.randint(97, 100)
        rr = rng.randint(14, 18)
        temp_c = round(rng.uniform(36.5, 37.3), 1)
        gcs = 15
        risk_score = round(rng.uniform(18.0, 38.0), 1)
        is_high_risk = False
        recommended_bed = "General Medicine"

        explain_factors.append("Single diagnostic resource anticipated (X-Ray / Simple Procedure)")
        explain_factors.append("Completely stable vital signs")

    else: # Level 5 - Non Urgent
        arrival_mode = "Walk-in"
        complaints_pool = [
            ("Request for routine antihypertensive medication prescription refill", ["Medication refill"], ["Comfortable", "Asymptomatic"]),
            ("Suture removal from healed forehead laceration (10 days post-injury)", ["Suture removal"], ["Well-appearing"]),
            ("Mild chronic low back pain, unchanged for 3 months, requesting note", ["Back stiffness"], ["Ambulatory", "Normal posture"]),
            ("Minor localized poison ivy rash on forearm for 2 days", ["Localized rash"], ["Comfortable"]),
            ("Cold symptoms: nasal congestion and mild throat tickle for 24h", ["Rhinorrhea", "Mild scratchy throat"], ["Normal appearance"])
        ]
        scenario = rng.choice(complaints_pool)
        chief_complaint = scenario[0]
        symptoms = scenario[1]
        observations = scenario[2]

        heart_rate = rng.randint(60, 82)
        sbp = rng.randint(112, 132)
        dbp = max(60, min(rng.randint(70, 84), sbp - 20))
        spo2 = rng.randint(98, 100)
        rr = rng.randint(12, 16)
        temp_c = round(rng.uniform(36.5, 37.0), 1)
        gcs = 15
        risk_score = round(rng.uniform(4.0, 16.0), 1)
        is_high_risk = False
        recommended_bed = "General Medicine"

        explain_factors.append("Zero diagnostic resources required (Fast-track eligible)")
        explain_factors.append("All vital signs within normal reference limits")

    return {
        "patient_id": f"P-{10000 + patient_num}",
        "full_name": full_name,
        "dob": dob_str,
        "age": age,
        "gender": gender,
        "arrival_mode": arrival_mode,
        "arrival_timestamp": arrival_str,
        "chief_complaint": chief_complaint,
        "symptoms": "; ".join(symptoms),
        "clinician_observations": "; ".join(observations),
        "known_allergies": "; ".join(allergies),
        "medical_history": "; ".join(comorbs),
        "heart_rate": heart_rate,
        "sbp": sbp,
        "dbp": dbp,
        "spo2": spo2,
        "respiratory_rate": rr,
        "temperature_c": temp_c,
        "gcs": gcs,
        "synthetic_esi_level": target_esi,
        "synthetic_risk_score": risk_score,
        "is_high_risk": is_high_risk,
        "recommended_bed_unit": recommended_bed,
        "key_explainability_factors": "; ".join(explain_factors)
    }


def generate_dataset(num_records: int = 500, seed: int = 42, output_path: str = "data/synthetic/patients_synthetic.csv"):
    """Generate a full synthetic patient cohort with realistic ESI distributions."""
    rng = random.Random(seed)
    base_time = datetime(2026, 8, 25, 16, 0, 0)

    # Realistic ESI weights: L1: 6%, L2: 24%, L3: 38%, L4: 22%, L5: 10%
    esi_weights = [1] * int(num_records * 0.06) + \
                  [2] * int(num_records * 0.24) + \
                  [3] * int(num_records * 0.38) + \
                  [4] * int(num_records * 0.22) + \
                  [5] * int(num_records * 0.10)
    
    # Pad to exact num_records if rounding difference
    while len(esi_weights) < num_records:
        esi_weights.append(3)
    rng.shuffle(esi_weights)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    fieldnames = [
        "patient_id", "full_name", "dob", "age", "gender", "arrival_mode", "arrival_timestamp",
        "chief_complaint", "symptoms", "clinician_observations", "known_allergies", "medical_history",
        "heart_rate", "sbp", "dbp", "spo2", "respiratory_rate", "temperature_c", "gcs",
        "synthetic_esi_level", "synthetic_risk_score", "is_high_risk", "recommended_bed_unit",
        "key_explainability_factors"
    ]

    records = []
    for i in range(1, num_records + 1):
        target_esi = esi_weights[i - 1]
        record = generate_single_patient(i, target_esi, base_time, rng)
        records.append(record)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"[SUCCESS] Generated {len(records)} synthetic patient records saved to: {output_path} (Seed: {seed})")
    return records


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic patient dataset for PatientTriage.ai")
    parser.add_argument("--count", type=int, default=500, help="Number of records to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--output", type=str, default="data/synthetic/patients_synthetic.csv", help="Output CSV path")
    args = parser.parse_args()
    
    generate_dataset(num_records=args.count, seed=args.seed, output_path=args.output)

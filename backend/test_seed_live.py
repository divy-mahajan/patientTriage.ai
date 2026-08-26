"""
PatientTriage.ai — Live API Verification Against Seed Dataset
"""

import os
import json
import pandas as pd
import httpx

def main():
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=15.0)
    
    # 1. Health check
    h = client.get("/health").json()
    print("=" * 110)
    print(f"HOSPITAL PROFILE ACTIVE: {h['active_hospital_profile']} | Total Beds: {h['total_beds']}")
    print("=" * 110)

    # 2. Doctors Roster Check
    docs_res = client.get("/api/doctors").json()
    print(f"Active Doctors Seeded in SQLite: {docs_res['total']} (Available: {docs_res['available_count']})")
    
    # 3. Sample from each synthetic ESI Level 1-5
    df = pd.read_csv(os.path.join("data", "synthetic", "patients_synthetic.csv"))
    sampled = df.groupby("synthetic_esi_level").head(1).to_dict(orient="records")
    
    print("\nExecuting Full API Pipeline on 5 Representative Seed Patients (ESI 1 through 5):")
    print("-" * 110)
    
    results = []
    for p in sampled:
        # Ingest
        p_id = f"LIVE-SEED-{p['patient_id']}"
        intake_res = client.post("/api/patients", json={
            "patient_id": p_id,
            "full_name": p["full_name"],
            "dob": p["dob"],
            "age": int(p["age"]),
            "gender": p["gender"],
            "arrival_mode": p["arrival_mode"],
            "chief_complaint": p["chief_complaint"],
            "symptoms": p["symptoms"],
            "clinician_observations": p["clinician_observations"],
            "known_allergies": p["known_allergies"],
            "medical_history": p["medical_history"],
            "heart_rate": float(p["heart_rate"]),
            "sbp": float(p["sbp"]),
            "dbp": float(p["dbp"]),
            "spo2": float(p["spo2"]),
            "respiratory_rate": float(p["respiratory_rate"]),
            "temperature_c": float(p["temperature_c"]),
            "gcs": float(p["gcs"])
        }).json()
        
        # Triage Score
        score_res = client.post("/api/triage/score", json={"patient_id": p_id}).json()
        
        # Bed Recommend
        bed_res = client.post("/api/beds/recommend", json={
            "patient_id": p_id,
            "predicted_triage_level": score_res["predicted_triage_level"],
            "is_high_risk": score_res["is_high_risk"],
            "chief_complaint": p["chief_complaint"],
            "symptoms": p["symptoms"]
        }).json()
        
        # Doctor Assign
        doc_res = client.post("/api/doctors/assign", json={
            "patient_id": p_id,
            "predicted_triage_level": score_res["predicted_triage_level"],
            "chief_complaint": p["chief_complaint"],
            "age": int(p["age"])
        }).json()
        
        # Test Recommendations
        test_res = client.post("/api/tests/recommend", json={
            "patient_id": p_id,
            "chief_complaint": p["chief_complaint"],
            "symptoms": p["symptoms"]
        }).json()
        
        top_bed = bed_res.get("recommended_bed", {})
        top_factors = [f["factor"] for f in score_res.get("top_factors", [])[:2]]
        
        results.append({
            "ID": p_id,
            "Complaint": p["chief_complaint"][:32] + "...",
            "Seed ESI": p["synthetic_esi_level"],
            "Pred ESI": score_res["predicted_triage_level"],
            "Risk": f"{score_res['risk_score']}%",
            "High-Risk": score_res["is_high_risk"],
            "Recommended Bed": f"{top_bed.get('bed_label', 'N/A')} ({top_bed.get('unit_name', 'N/A')})",
            "Doctor Assigned": f"{doc_res['doctor']['name']} ({doc_res['doctor']['specialty']})",
            "Tests": len(test_res.get("suggested_tests", []))
        })
    
    summary_df = pd.DataFrame(results)
    print(summary_df.to_string(index=False))
    print("=" * 110)

if __name__ == "__main__":
    main()

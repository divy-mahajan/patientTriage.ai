"""
PatientTriage.ai — Deterministic Bed Recommendation & Assignment Service

Rule-based, explainable clinical bed matching engine that selects the optimal available bed
based on:
- Triage priority acuity (ESI 1 to 5)
- High-risk clinical status
- Unit type affinity (Resuscitation, ED, Cardiology, Observation, General Med)
- Equipment / capability matching (ventilator, telemetry, cardiac monitor, oxygen wall)
- Live hospital capacity and bed availability

STRICT CONSTRAINTS:
Bed assignment is deterministic, rule-based, and explainable — NOT directly predicted by the ML model.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.db.models import Patient, BedAssignment
from backend.app.schemas.bed import (
    BedRecommendRequest,
    BedRecommendResponse,
    RecommendedBedOption,
    BedAssignRequest,
    BedAssignResponse
)
from backend.app.services.hospital_service import hospital_service


# Preferred unit types based on clinical triage level and presentation
UNIT_PREFERENCES = {
    1: ["resuscitation", "emergency"],
    2: ["cardiology", "emergency", "resuscitation"],
    3: ["observation", "emergency", "general_medicine"],
    4: ["general_medicine", "observation"],
    5: ["general_medicine", "observation"]
}


class BedAssignmentService:
    def recommend_bed(self, request: BedRecommendRequest) -> BedRecommendResponse:
        """
        Deterministically evaluate all available hospital beds and return the top match.
        """
        available_beds = hospital_service.get_available_beds()
        rule_chain = []
        
        rule_chain.append(f"Patient evaluated at Priority Level {request.predicted_triage_level} (High Risk: {request.is_high_risk})")
        
        # 1. Determine clinical unit preference based on complaint and acuity
        complaint_lower = (request.chief_complaint + " " + (request.symptoms or "")).lower()
        
        preferred_units = list(UNIT_PREFERENCES.get(request.predicted_triage_level, ["general_medicine"]))
        
        # Refine preference based on clinical syndromes
        if "chest" in complaint_lower or "cardiac" in complaint_lower or "infarction" in complaint_lower:
            preferred_units = ["cardiology", "resuscitation", "emergency"]
            rule_chain.append("Cardiac / Chest Pain syndrome matched -> prioritizing Cardiology Unit / Telemetry beds")
        elif "stroke" in complaint_lower or "hemiplegia" in complaint_lower:
            preferred_units = ["emergency", "resuscitation", "cardiology"]
            rule_chain.append("Neurological / Stroke presentation -> prioritizing Acute Emergency Bays")
        elif request.predicted_triage_level == 1:
            preferred_units = ["resuscitation", "emergency"]
            rule_chain.append("Level 1 Resuscitation presentation -> strictly prioritizing Resuscitation Unit")
        elif request.predicted_triage_level in [4, 5]:
            preferred_units = ["general_medicine", "observation"]
            rule_chain.append("Low acuity ambulatory presentation -> prioritizing General Medicine / Fast-track")

        # 2. Determine necessary equipment
        required_eq = list(request.required_equipment or [])
        if request.predicted_triage_level == 1 and "ventilator" not in required_eq:
            required_eq.append("ventilator")
            rule_chain.append("Level 1 mandatory capability added: Ventilator")
        if (request.predicted_triage_level in [1, 2] or "cardiac" in complaint_lower) and "cardiac_monitor" not in required_eq:
            required_eq.append("cardiac_monitor")
            rule_chain.append("High-acuity mandatory capability added: Cardiac Monitor")

        # 3. Score each available bed
        scored_beds: List[RecommendedBedOption] = []
        
        for bed in available_beds:
            score = 0.0
            reasons = []
            
            unit_type = bed.get("unit_type", "").lower()
            bed_eq = set(bed.get("equipment", []))
            
            # Unit type affinity
            if preferred_units and unit_type == preferred_units[0]:
                score += 50.0
                reasons.append(f"Optimal unit type match: {bed.get('unit_name')}")
            elif len(preferred_units) > 1 and unit_type in preferred_units[1:]:
                score += 30.0
                reasons.append(f"Acceptable alternative unit type: {bed.get('unit_name')}")
            else:
                score += 10.0
                reasons.append(f"Secondary unit type overflow: {bed.get('unit_name')}")

            # Equipment capability matching
            missing_critical = False
            for req in required_eq:
                if req in bed_eq:
                    score += 15.0
                    reasons.append(f"Equipped with required {req.replace('_', ' ').title()}")
                else:
                    # Penalize missing critical equipment
                    score -= 25.0
                    missing_critical = True
                    reasons.append(f"Missing required {req.replace('_', ' ').title()}")

            # Bonus for telemetry/oxygen availability
            if "oxygen_wall" in bed_eq:
                score += 5.0
            if "continuous_telemetry" in bed_eq and request.is_high_risk:
                score += 10.0
                reasons.append("Equipped with Continuous Telemetry")

            scored_beds.append(
                RecommendedBedOption(
                    unit_id=bed["unit_id"],
                    unit_name=bed["unit_name"],
                    bed_id=bed["bed_id"],
                    bed_label=bed["bed_label"],
                    room_number=bed.get("room_number", "N/A"),
                    equipment=bed.get("equipment", []),
                    match_score=round(score, 1),
                    suitability_reasons=reasons
                )
            )

        # Sort by match score descending
        scored_beds.sort(key=lambda b: b.match_score, reverse=True)

        top_bed = scored_beds[0] if scored_beds else None
        alternatives = scored_beds[1:4] if len(scored_beds) > 1 else []

        if top_bed:
            rationale = f"Assigned {top_bed.bed_label} in {top_bed.unit_name} (Score: {top_bed.match_score}) based on {preferred_units[0].title()} preference and capability match."
            rule_chain.append(f"Final Selection: {top_bed.bed_label} ({top_bed.unit_name})")
        else:
            rationale = "CRITICAL CAPACITY ALERT: No available beds found in the active hospital profile matching criteria."
            rule_chain.append("No available beds detected across hospital units")

        return BedRecommendResponse(
            patient_id=request.patient_id,
            recommended_bed=top_bed,
            alternative_beds=alternatives,
            assignment_rationale=rationale,
            deterministic_rule_chain=rule_chain,
            evaluated_at=datetime.utcnow()
        )

    def assign_bed(self, db: Session, request: BedAssignRequest) -> BedAssignResponse:
        """
        Execute live bed assignment, mutating bed status to 'occupied' and updating patient workflow.
        """
        # 1. Update hospital capacity state
        success = hospital_service.set_bed_status(
            bed_id=request.bed_id,
            new_status="occupied",
            patient_id=request.patient_id
        )
        if not success:
            raise ValueError(f"Bed ID '{request.bed_id}' not found in active hospital profile")

        # 2. Get bed details from active profile
        capacity = hospital_service.get_capacity_state()
        hospital_id = capacity.get("hospital_id", "unknown_hospital")
        unit_name = "General"
        unit_id = request.unit_id or "ED"
        bed_label = request.bed_id

        for u in capacity.get("units", []):
            for b in u.get("beds", []):
                if b["bed_id"] == request.bed_id:
                    unit_name = u["unit_name"]
                    unit_id = u["unit_id"]
                    bed_label = b["bed_label"]
                    break

        # 3. Create database record
        assignment = BedAssignment(
            patient_id=request.patient_id,
            hospital_id=hospital_id,
            unit_id=unit_id,
            unit_name=unit_name,
            bed_id=request.bed_id,
            bed_label=bed_label,
            assigned_at=datetime.utcnow(),
            status="active",
            assignment_rationale={"assigned_by": "triage_coordinator", "notes": request.notes or ""}
        )
        db.add(assignment)

        # 4. Update patient workflow status
        patient = db.query(Patient).filter(Patient.patient_id == request.patient_id).first()
        if patient:
            patient.status = "assigned_bed"

        db.commit()
        db.refresh(assignment)

        return BedAssignResponse(
            assignment_id=assignment.id,
            patient_id=request.patient_id,
            hospital_id=hospital_id,
            unit_id=unit_id,
            unit_name=unit_name,
            bed_id=request.bed_id,
            bed_label=bed_label,
            status="active",
            assigned_at=assignment.assigned_at,
            message=f"Patient {request.patient_id} successfully assigned to {bed_label} ({unit_name})."
        )


bed_service = BedAssignmentService()

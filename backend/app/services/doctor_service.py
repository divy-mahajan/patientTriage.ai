"""
PatientTriage.ai — Doctor Roster & Assignment Service

Handles:
- Physician check-in and live shift/caseload status tracking
- Rule-based, explainable physician assignment matching clinical presentation,
  physician specialty, availability, and active workload balance
- Preloading default doctor roster from synthetic CSV on initial startup
"""

import os
import csv
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.models import Doctor, DoctorAssignment, Patient
from backend.app.schemas.doctor import (
    DoctorCheckInRequest,
    DoctorResponse,
    DoctorListResponse,
    DoctorAssignRequest,
    DoctorAssignResponse
)


SPECIALTY_ROUTING = {
    "cardiology": ["Cardiology", "Emergency Medicine", "Internal Medicine"],
    "trauma": ["Trauma Surgery", "Emergency Medicine", "General Surgery"],
    "pediatric": ["Pediatrics", "Emergency Medicine"],
    "stroke": ["Neurology", "Emergency Medicine", "Internal Medicine"],
    "respiratory": ["Pulmonology", "Emergency Medicine", "Internal Medicine"],
    "general": ["Emergency Medicine", "Internal Medicine", "Family Medicine"]
}


class DoctorService:
    @staticmethod
    def seed_initial_roster_if_empty(db: Session):
        """Seed doctor table from synthetic CSV roster if empty."""
        count = db.query(Doctor).count()
        if count == 0 and os.path.exists(settings.doctors_roster_path):
            with open(settings.doctors_roster_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    doc = Doctor(
                        doctor_id=row["doctor_id"],
                        name=row["name"],
                        specialty=row["specialty"],
                        shift_status=row.get("shift_status", "Active Shift"),
                        is_available=(str(row.get("is_available", "True")).lower() in ["true", "1"]),
                        max_caseload=int(row.get("max_caseload", 5)),
                        current_caseload=int(row.get("current_caseload", 0)),
                        last_checkin_at=datetime.utcnow()
                    )
                    db.add(doc)
            db.commit()

    @staticmethod
    def check_in_doctor(db: Session, request: DoctorCheckInRequest) -> Doctor:
        """Check in or update physician shift and availability."""
        doc = db.query(Doctor).filter(Doctor.doctor_id == request.doctor_id).first()
        if not doc:
            doc = Doctor(
                doctor_id=request.doctor_id,
                name=request.name,
                specialty=request.specialty,
                shift_status=request.shift_status,
                is_available=request.is_available,
                max_caseload=request.max_caseload,
                current_caseload=request.current_caseload,
                last_checkin_at=datetime.utcnow()
            )
            db.add(doc)
        else:
            doc.name = request.name
            doc.specialty = request.specialty
            doc.shift_status = request.shift_status
            doc.is_available = request.is_available
            doc.max_caseload = request.max_caseload
            doc.current_caseload = request.current_caseload
            doc.last_checkin_at = datetime.utcnow()

        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def list_doctors(db: Session, specialty: Optional[str] = None, active_only: bool = False) -> DoctorListResponse:
        """List doctors tracked in the database."""
        query = db.query(Doctor)
        if specialty:
            query = query.filter(Doctor.specialty.ilike(f"%{specialty}%"))
        if active_only:
            query = query.filter(Doctor.shift_status == "Active Shift", Doctor.is_available == True)

        doctors = query.all()
        avail_count = sum(1 for d in doctors if d.is_available and d.shift_status == "Active Shift")

        return DoctorListResponse(
            total=len(doctors),
            available_count=avail_count,
            doctors=[DoctorResponse.model_validate(d) for d in doctors]
        )

    @staticmethod
    def assign_doctor(db: Session, request: DoctorAssignRequest) -> DoctorAssignResponse:
        """
        Deterministically assign the most appropriate available physician based on
        specialty match, shift status, and workload balance.
        """
        # Manual assignment override
        if request.manual_doctor_id:
            doc = db.query(Doctor).filter(Doctor.doctor_id == request.manual_doctor_id).first()
            if not doc:
                raise ValueError(f"Doctor '{request.manual_doctor_id}' not found")
            
            doc.current_caseload += 1
            if doc.current_caseload >= doc.max_caseload:
                doc.is_available = False
            
            assignment = DoctorAssignment(
                patient_id=request.patient_id,
                doctor_id=doc.doctor_id,
                assigned_at=datetime.utcnow(),
                status="assigned",
                assignment_rationale={"type": "manual_override"}
            )
            db.add(assignment)
            db.commit()
            db.refresh(assignment)
            
            return DoctorAssignResponse(
                assignment_id=assignment.id,
                patient_id=request.patient_id,
                doctor=DoctorResponse.model_validate(doc),
                assignment_rationale=f"Manually assigned to {doc.name} ({doc.specialty})",
                match_score=100.0,
                assigned_at=assignment.assigned_at
            )

        # Retrieve patient information if in DB
        patient = db.query(Patient).filter(Patient.patient_id == request.patient_id).first()
        complaint = (request.chief_complaint or (patient.chief_complaint if patient else "")).lower()
        age = request.age if request.age is not None else (patient.age if patient else 40)

        # Determine preferred specialties
        if age < 18:
            preferred = SPECIALTY_ROUTING["pediatric"]
            reason_category = "Pediatric Care"
        elif "chest" in complaint or "cardiac" in complaint or "heart" in complaint:
            preferred = SPECIALTY_ROUTING["cardiology"]
            reason_category = "Cardiology"
        elif "trauma" in complaint or "fracture" in complaint or "collision" in complaint:
            preferred = SPECIALTY_ROUTING["trauma"]
            reason_category = "Trauma Surgery"
        elif "stroke" in complaint or "hemiplegia" in complaint:
            preferred = SPECIALTY_ROUTING["stroke"]
            reason_category = "Neurology"
        else:
            preferred = SPECIALTY_ROUTING["general"]
            reason_category = "Emergency Medicine"

        # Fetch active, available doctors
        candidates = db.query(Doctor).filter(
            Doctor.shift_status == "Active Shift",
            Doctor.is_available == True,
            Doctor.current_caseload < Doctor.max_caseload
        ).all()

        if not candidates:
            # Fallback: check any on active shift even if near capacity
            candidates = db.query(Doctor).filter(Doctor.shift_status == "Active Shift").all()

        if not candidates:
            raise ValueError("No active physicians currently available on shift for assignment")

        # Score candidates
        scored_candidates = []
        for doc in candidates:
            score = 50.0
            
            # Specialty match
            if doc.specialty in preferred:
                rank_idx = preferred.index(doc.specialty)
                score += (30.0 - rank_idx * 10.0)
            
            # Workload balance (penalize higher caseload percentage)
            utilization = float(doc.current_caseload) / float(max(1, doc.max_caseload))
            score += (20.0 * (1.0 - utilization))

            scored_candidates.append((score, doc))

        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        best_score, selected_doc = scored_candidates[0]

        # Update doctor's caseload
        selected_doc.current_caseload += 1
        if selected_doc.current_caseload >= selected_doc.max_caseload:
            selected_doc.is_available = False

        # Create assignment record
        assignment = DoctorAssignment(
            patient_id=request.patient_id,
            doctor_id=selected_doc.doctor_id,
            assigned_at=datetime.utcnow(),
            status="assigned",
            assignment_rationale={
                "matched_category": reason_category,
                "preferred_specialties": preferred,
                "score": round(best_score, 1),
                "caseload_after_assignment": f"{selected_doc.current_caseload}/{selected_doc.max_caseload}"
            }
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)

        rationale_msg = (
            f"Assigned to {selected_doc.name} ({selected_doc.specialty}) based on {reason_category} "
            f"match and current capacity ({selected_doc.current_caseload}/{selected_doc.max_caseload} patients)."
        )

        return DoctorAssignResponse(
            assignment_id=assignment.id,
            patient_id=request.patient_id,
            doctor=DoctorResponse.model_validate(selected_doc),
            assignment_rationale=rationale_msg,
            match_score=round(best_score, 1),
            assigned_at=assignment.assigned_at
        )


doctor_service = DoctorService()

"""
PatientTriage.ai — Patient Treatment & Prescription Service

Manages active clinical treatments, infusions, and medications associated with patients.
Calculates remaining infusion volume dynamically based on elapsed time and rate.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.db.models import PatientTreatment, Patient, AuditLog
from backend.app.schemas.treatment import TreatmentCreate, TreatmentUpdate, TreatmentResponse


class TreatmentService:
    def calculate_treatment_state(self, treatment: PatientTreatment) -> Dict[str, Any]:
        """
        Dynamically calculate remaining quantity and operational flags.
        Ensures remaining quantity is never negative.
        """
        rem = treatment.remaining_quantity
        is_low = False
        is_replacement_required = False
        curr_status = treatment.status

        if treatment.starting_quantity is not None and treatment.infusion_rate and treatment.start_time:
            if treatment.status in ["ACTIVE", "RUNNING", "LOW", "REPLACEMENT REQUIRED"]:
                elapsed_hours = max(0.0, (datetime.utcnow() - treatment.start_time).total_seconds() / 3600.0)
                consumed = elapsed_hours * treatment.infusion_rate
                rem = max(0.0, treatment.starting_quantity - consumed)
                rem = round(rem, 1)

                threshold = treatment.low_threshold or 200.0
                if rem <= 50.0:
                    is_replacement_required = True
                    is_low = True
                    curr_status = "REPLACEMENT REQUIRED"
                elif rem < threshold:
                    is_low = True
                    curr_status = "LOW"
                else:
                    curr_status = "RUNNING"

        elif rem is not None:
            threshold = treatment.low_threshold or 200.0
            if rem <= 50.0:
                is_replacement_required = True
                is_low = True
                curr_status = "REPLACEMENT REQUIRED"
            elif rem < threshold:
                is_low = True
                curr_status = "LOW"

        return {
            "remaining_quantity": rem,
            "status": curr_status,
            "is_low": is_low,
            "is_replacement_required": is_replacement_required
        }

    def list_patient_treatments(self, db: Session, patient_id: str) -> List[TreatmentResponse]:
        """Retrieve and dynamically calculate all active and historical treatments for a patient."""
        treatments = db.query(PatientTreatment).filter(
            PatientTreatment.patient_id == patient_id
        ).order_by(PatientTreatment.created_at.desc()).all()

        results = []
        for t in treatments:
            calc = self.calculate_treatment_state(t)
            results.append(
                TreatmentResponse(
                    id=t.id,
                    patient_id=t.patient_id,
                    name=t.name,
                    type=t.type,
                    dose=t.dose,
                    route=t.route,
                    frequency=t.frequency,
                    status=calc["status"],
                    start_time=t.start_time,
                    next_administration=t.next_administration,
                    starting_quantity=t.starting_quantity,
                    remaining_quantity=calc["remaining_quantity"],
                    quantity_unit=t.quantity_unit,
                    infusion_rate=t.infusion_rate,
                    low_threshold=t.low_threshold,
                    is_low=calc["is_low"],
                    is_replacement_required=calc["is_replacement_required"],
                    created_at=t.created_at,
                    updated_at=t.updated_at
                )
            )
        return results

    def add_treatment(self, db: Session, req: TreatmentCreate, actor: str = "Physician") -> TreatmentResponse:
        """Create a new treatment order for a patient."""
        start_time = req.start_time or datetime.utcnow()
        rem = req.remaining_quantity if req.remaining_quantity is not None else req.starting_quantity

        treatment = PatientTreatment(
            patient_id=req.patient_id,
            name=req.name,
            type=req.type,
            dose=req.dose,
            route=req.route,
            frequency=req.frequency,
            status=req.status or "ACTIVE",
            start_time=start_time,
            next_administration=req.next_administration,
            starting_quantity=req.starting_quantity,
            remaining_quantity=rem,
            quantity_unit=req.quantity_unit or "mL",
            infusion_rate=req.infusion_rate,
            low_threshold=req.low_threshold or 200.0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(treatment)

        # Audit log
        log_entry = AuditLog(
            event_type="TREATMENT_ORDERED",
            patient_id=req.patient_id,
            actor=actor,
            new_state={
                "treatment_name": req.name,
                "dose": req.dose,
                "route": req.route,
                "rate": req.infusion_rate
            },
            reason=f"Ordered {req.name} ({req.dose}) via {req.route}",
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)

        db.commit()
        db.refresh(treatment)

        calc = self.calculate_treatment_state(treatment)
        return TreatmentResponse(
            id=treatment.id,
            patient_id=treatment.patient_id,
            name=treatment.name,
            type=treatment.type,
            dose=treatment.dose,
            route=treatment.route,
            frequency=treatment.frequency,
            status=calc["status"],
            start_time=treatment.start_time,
            next_administration=treatment.next_administration,
            starting_quantity=treatment.starting_quantity,
            remaining_quantity=calc["remaining_quantity"],
            quantity_unit=treatment.quantity_unit,
            infusion_rate=treatment.infusion_rate,
            low_threshold=treatment.low_threshold,
            is_low=calc["is_low"],
            is_replacement_required=calc["is_replacement_required"],
            created_at=treatment.created_at,
            updated_at=treatment.updated_at
        )

    def complete_patient_treatments(self, db: Session, patient_id: str, reason: str = "Discharged"):
        """Mark all active treatments for a patient as COMPLETED upon bed release or discharge."""
        treatments = db.query(PatientTreatment).filter(
            PatientTreatment.patient_id == patient_id,
            PatientTreatment.status.in_(["ACTIVE", "RUNNING", "LOW", "REPLACEMENT REQUIRED", "PAUSED"])
        ).all()

        for t in treatments:
            t.status = "COMPLETED"
            t.updated_at = datetime.utcnow()

        if treatments:
            db.commit()

    def seed_initial_treatments_if_empty(self, db: Session):
        """Seed realistic initial treatments for admitted patient records if table is empty."""
        try:
            count = db.query(PatientTreatment).count()
            if count > 0:
                return

            patients = db.query(Patient).all()
            if not patients:
                return

            from datetime import timedelta
            for idx, p in enumerate(patients[:15]):
                p_lvl = p.predicted_triage_level or 3
                if p_lvl == 1:
                    db.add(PatientTreatment(
                        patient_id=p.patient_id,
                        name="IV Norepinephrine",
                        type="infusion",
                        dose="0.1 mcg/kg/min",
                        route="Central IV",
                        frequency="Continuous",
                        status="RUNNING",
                        start_time=datetime.utcnow() - timedelta(minutes=45),
                        starting_quantity=500.0,
                        remaining_quantity=320.0,
                        quantity_unit="mL",
                        infusion_rate=15.0,
                        low_threshold=100.0
                    ))
                    db.add(PatientTreatment(
                        patient_id=p.patient_id,
                        name="Normal Saline",
                        type="infusion",
                        dose="500 mL/hr",
                        route="IV",
                        frequency="Continuous",
                        status="LOW",
                        start_time=datetime.utcnow() - timedelta(hours=1, minutes=30),
                        starting_quantity=1000.0,
                        remaining_quantity=180.0,
                        quantity_unit="mL",
                        infusion_rate=500.0,
                        low_threshold=250.0
                    ))
                elif p_lvl == 2:
                    db.add(PatientTreatment(
                        patient_id=p.patient_id,
                        name="IV Saline Infusion",
                        type="infusion",
                        dose="100 mL/hr",
                        route="IV",
                        frequency="Continuous",
                        status="RUNNING",
                        start_time=datetime.utcnow() - timedelta(hours=2),
                        starting_quantity=1000.0,
                        remaining_quantity=650.0,
                        quantity_unit="mL",
                        infusion_rate=100.0,
                        low_threshold=200.0
                    ))
                    db.add(PatientTreatment(
                        patient_id=p.patient_id,
                        name="Ceftriaxone",
                        type="medication",
                        dose="1 g IV",
                        route="IV Piggyback",
                        frequency="Q24H",
                        status="ACTIVE",
                        start_time=datetime.utcnow() - timedelta(hours=1),
                        next_administration="18:00"
                    ))
                    db.add(PatientTreatment(
                        patient_id=p.patient_id,
                        name="Supplemental Oxygen",
                        type="respiratory",
                        dose="4 L/min",
                        route="Nasal Cannula",
                        frequency="Continuous",
                        status="ACTIVE",
                        start_time=datetime.utcnow() - timedelta(hours=1)
                    ))
                elif p_lvl == 3:
                    db.add(PatientTreatment(
                        patient_id=p.patient_id,
                        name="Oral Rehydration Solution",
                        type="oral",
                        dose="200 mL/hr",
                        route="Oral",
                        frequency="Ad libitum",
                        status="ACTIVE",
                        start_time=datetime.utcnow() - timedelta(minutes=30)
                    ))
            db.commit()
        except Exception as e:
            print(f"Treatment seed note: {e}")


treatment_service = TreatmentService()

"""
PatientTriage.ai — Hospital Capacity & Swappable Profile Service

Manages:
- Loading swappable hospital configuration JSON profiles
- Discovering and listing available hospital profiles dynamically
- Maintaining runtime mutable bed states (available, occupied, cleaning, reserved, unavailable)
- Updating waiting room metrics and surge status
- Reconciling summary counts dynamically without hardcoding
"""

import os
import json
import threading
from datetime import datetime
from typing import Dict, Any, Optional, List
from backend.app.core.config import settings
from backend.app.schemas.hospital import (
    HospitalCapacityUpdateRequest,
    BedStateUpdate,
    HospitalProfileSummary,
    HospitalProfilesListResponse
)


class HospitalCapacityService:
    """
    Thread-safe service managing swappable hospital configurations and live bed states.
    """
    def __init__(self):
        self._lock = threading.RLock()
        self._active_profile_path = settings.default_hospital_profile_path
        self._capacity_state: Dict[str, Any] = {}
        self._last_updated = datetime.utcnow()
        self.load_profile(self._active_profile_path)

    def load_profile(self, profile_path: str) -> Dict[str, Any]:
        """Load and initialize a hospital profile from JSON configuration."""
        if not os.path.exists(profile_path):
            raise FileNotFoundError(f"Hospital profile not found at: {profile_path}")

        with open(profile_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        with self._lock:
            self._active_profile_path = profile_path
            self._capacity_state = data
            self._reconcile_summary_counts()
            self._last_updated = datetime.utcnow()

        return self._capacity_state

    def list_available_profiles(self) -> HospitalProfilesListResponse:
        """Scan hospital profiles directory and return summary metadata for all profiles."""
        profiles: List[HospitalProfileSummary] = []
        active_id = self._capacity_state.get("hospital_id", "st_marys_general")

        profiles_dir = settings.hospital_profiles_dir
        if os.path.exists(profiles_dir):
            for fname in os.listdir(profiles_dir):
                if fname.endswith(".json"):
                    fpath = os.path.join(profiles_dir, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            pdata = json.load(f)
                            p_id = pdata.get("hospital_id", fname.replace(".json", ""))
                            total_beds = pdata.get("summary", {}).get("total_beds", 0)
                            if total_beds == 0:
                                total_beds = sum(len(u.get("beds", [])) for u in pdata.get("units", []))
                            avail_beds = pdata.get("summary", {}).get("available_beds", 0)
                            if avail_beds == 0:
                                avail_beds = sum(
                                    sum(1 for b in u.get("beds", []) if b.get("status") == "available")
                                    for u in pdata.get("units", [])
                                )

                            profiles.append(
                                HospitalProfileSummary(
                                    hospital_id=p_id,
                                    name=pdata.get("name", "Hospital"),
                                    emergency_level=pdata.get("emergency_level", "Emergency Center"),
                                    address=pdata.get("address", "Medical District"),
                                    total_beds=total_beds,
                                    available_beds=avail_beds,
                                    waiting_room_capacity=pdata.get("waiting_room", {}).get("capacity", 40),
                                    is_active=(p_id == active_id)
                                )
                            )
                    except Exception as err:
                        print(f"Warning: Failed to load profile {fname}: {err}")

        # Ensure active profile is always listed
        if not any(p.hospital_id == active_id for p in profiles):
            profiles.insert(
                0,
                HospitalProfileSummary(
                    hospital_id=active_id,
                    name=self._capacity_state.get("name", "Active Hospital"),
                    emergency_level=self._capacity_state.get("emergency_level", "Emergency Dept"),
                    address=self._capacity_state.get("address", "Medical Center"),
                    total_beds=self._capacity_state.get("summary", {}).get("total_beds", 24),
                    available_beds=self._capacity_state.get("summary", {}).get("available_beds", 8),
                    waiting_room_capacity=self._capacity_state.get("waiting_room", {}).get("capacity", 45),
                    is_active=True
                )
            )

        return HospitalProfilesListResponse(
            profiles=profiles,
            active_hospital_id=active_id
        )

    def swap_profile_by_id(self, hospital_id: str) -> Dict[str, Any]:
        """Swap to a different hospital profile by its hospital ID."""
        target_file = os.path.join(settings.hospital_profiles_dir, f"{hospital_id}.json")
        if not os.path.exists(target_file):
            raise ValueError(f"No profile found for hospital ID '{hospital_id}' at {target_file}")
        return self.load_profile(target_file)

    def get_capacity_state(self, enrich: bool = True) -> Dict[str, Any]:
        """Return a copy of the current live hospital capacity state, enriched with database patient records and treatments."""
        with self._lock:
            self._reconcile_summary_counts()
            state = json.loads(json.dumps(self._capacity_state))
            state["last_updated"] = self._last_updated
            if enrich:
                state = self._enrich_state_with_db(state)
            return state

    def _enrich_state_with_db(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Attach live patient details, doctor information, and active treatments from SQLite."""
        try:
            from backend.app.db.database import SessionLocal
            from backend.app.db.models import Patient, Doctor, PatientTreatment
            from backend.app.services.treatment_service import treatment_service

            db = SessionLocal()
            try:
                patients_by_id = {p.patient_id: p for p in db.query(Patient).all()}
                doctors_by_id = {d.doctor_id: d for d in db.query(Doctor).all()}
                treatments_by_pid = {}
                for t in db.query(PatientTreatment).filter(
                    PatientTreatment.status.in_(["ACTIVE", "RUNNING", "LOW", "REPLACEMENT REQUIRED", "PAUSED"])
                ).all():
                    calc = treatment_service.calculate_treatment_state(t)
                    treatments_by_pid.setdefault(t.patient_id, []).append({
                        "id": t.id,
                        "name": t.name,
                        "type": t.type,
                        "dose": t.dose,
                        "route": t.route,
                        "frequency": t.frequency,
                        "status": calc["status"],
                        "remaining_quantity": calc["remaining_quantity"],
                        "quantity_unit": t.quantity_unit,
                        "infusion_rate": t.infusion_rate,
                        "next_administration": t.next_administration,
                        "is_low": calc["is_low"],
                        "is_replacement_required": calc["is_replacement_required"]
                    })

                for unit in state.get("units", []):
                    for bed in unit.get("beds", []):
                        pid = bed.get("assigned_patient_id") or bed.get("current_patient_id")
                        if pid and pid in patients_by_id:
                            p = patients_by_id[pid]
                            bed["assigned_patient_id"] = p.patient_id
                            bed["assigned_patient_name"] = p.full_name
                            bed["assigned_patient_age"] = p.age
                            bed["assigned_patient_gender"] = p.gender
                            bed["assigned_patient_complaint"] = p.chief_complaint
                            bed["assigned_patient_triage_level"] = p.predicted_triage_level or 3
                            bed["assigned_patient_triage_name"] = p.triage_level_name or "Urgent"
                            bed["assigned_patient_risk_score"] = p.risk_score or 50.0
                            bed["assigned_patient_monitoring_status"] = p.monitoring_status or "STABLE"
                            bed["assigned_patient_arrival_mode"] = p.arrival_mode
                            bed["assigned_patient_arrival_time"] = p.arrival_timestamp.isoformat() if p.arrival_timestamp else None
                            bed["assigned_patient_vitals"] = {
                                "heart_rate": p.heart_rate,
                                "sbp": p.sbp,
                                "dbp": p.dbp,
                                "spo2": p.spo2,
                                "respiratory_rate": p.respiratory_rate,
                                "temperature_c": p.temperature_c,
                                "gcs": p.gcs
                            }
                            bed["treatments"] = treatments_by_pid.get(p.patient_id, [])

                        doc_id = bed.get("assigned_doctor_id")
                        if doc_id and doc_id in doctors_by_id:
                            d = doctors_by_id[doc_id]
                            bed["assigned_doctor_name"] = d.name
                            bed["assigned_doctor_specialty"] = d.specialty
            finally:
                db.close()
        except Exception as e:
            # Fall back gracefully without breaking capacity response
            pass

        return state

    def update_capacity(self, update_req: HospitalCapacityUpdateRequest) -> Dict[str, Any]:
        """Apply runtime mutable updates to waiting room, surge status, or individual bed states."""
        with self._lock:
            if update_req.waiting_room_occupancy is not None:
                self._capacity_state["waiting_room"]["current_occupancy"] = update_req.waiting_room_occupancy
            if update_req.waiting_room_capacity is not None:
                self._capacity_state["waiting_room"]["capacity"] = update_req.waiting_room_capacity
            if update_req.surge_status is not None:
                self._capacity_state["surge_status"] = update_req.surge_status

            # Bed level updates
            if update_req.bed_updates:
                for b_up in update_req.bed_updates:
                    self._update_single_bed_state(b_up)

            self._reconcile_summary_counts()
            self._last_updated = datetime.utcnow()
            return self.get_capacity_state()

    def set_bed_status(self, bed_id: str, new_status: str, patient_id: Optional[str] = None) -> bool:
        """Helper to quickly set status of a bed (e.g. occupied upon assignment)."""
        with self._lock:
            for unit in self._capacity_state.get("units", []):
                for bed in unit.get("beds", []):
                    if bed["bed_id"] == bed_id:
                        bed["status"] = new_status
                        bed["assigned_patient_id"] = patient_id if new_status == "occupied" else None
                        self._reconcile_summary_counts()
                        self._last_updated = datetime.utcnow()
                        return True
        return False

    def get_available_beds(self) -> List[Dict[str, Any]]:
        """Return list of all currently available beds across all units."""
        with self._lock:
            available = []
            for unit in self._capacity_state.get("units", []):
                for bed in unit.get("beds", []):
                    if bed.get("status") == "available":
                        bed_info = dict(bed)
                        bed_info["unit_id"] = unit["unit_id"]
                        bed_info["unit_name"] = unit["unit_name"]
                        bed_info["unit_type"] = unit.get("unit_type", unit.get("unit_id", "general"))
                        available.append(bed_info)
            return available

    def _update_single_bed_state(self, update: BedStateUpdate):
        """Internal helper to mutate a single bed record."""
        for unit in self._capacity_state.get("units", []):
            for bed in unit.get("beds", []):
                if bed["bed_id"] == update.bed_id:
                    bed["status"] = update.status
                    if update.assigned_patient_id is not None:
                        bed["assigned_patient_id"] = update.assigned_patient_id
                    if update.cleaning_minutes_remaining is not None:
                        bed["cleaning_minutes_remaining"] = update.cleaning_minutes_remaining
                    if update.notes is not None:
                        bed["notes"] = update.notes
                    return

    def _reconcile_summary_counts(self):
        """Reconcile total, available, occupied, cleaning, reserved, unavailable counts dynamically."""
        total = 0
        avail = 0
        occ = 0
        clean = 0
        res = 0
        unavail = 0

        for unit in self._capacity_state.get("units", []):
            u_avail = 0
            u_occ = 0
            u_clean = 0
            u_res = 0
            u_unavail = 0

            for bed in unit.get("beds", []):
                status = bed.get("status", "available")
                if status == "available":
                    u_avail += 1
                elif status == "occupied":
                    u_occ += 1
                elif status == "cleaning":
                    u_clean += 1
                elif status == "reserved":
                    u_res += 1
                elif status == "unavailable":
                    u_unavail += 1

            unit["available_beds"] = u_avail
            unit["occupied_beds"] = u_occ
            unit["cleaning_beds"] = u_clean
            unit["reserved_beds"] = u_res
            unit["unavailable_beds"] = u_unavail
            unit["total_beds"] = len(unit.get("beds", []))

            total += unit["total_beds"]
            avail += u_avail
            occ += u_occ
            clean += u_clean
            res += u_res
            unavail += u_unavail

        self._capacity_state["summary"] = {
            "total_beds": total,
            "available_beds": avail,
            "occupied_beds": occ,
            "cleaning_beds": clean,
            "reserved_beds": res,
            "unavailable_beds": unavail
        }


# Global singleton instance
hospital_service = HospitalCapacityService()

"""
PatientTriage.ai — Hospital Capacity & Swappable Profile Service

Manages:
- Loading swappable hospital configuration JSON profiles
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
from backend.app.schemas.hospital import HospitalCapacityUpdateRequest, BedStateUpdate


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

    def swap_profile_by_id(self, hospital_id: str) -> Dict[str, Any]:
        """Swap to a different hospital profile by its hospital ID."""
        target_file = os.path.join(settings.hospital_profiles_dir, f"{hospital_id}.json")
        if not os.path.exists(target_file):
            raise ValueError(f"No profile found for hospital ID '{hospital_id}' at {target_file}")
        return self.load_profile(target_file)

    def get_capacity_state(self) -> Dict[str, Any]:
        """Return a copy of the current live hospital capacity state."""
        with self._lock:
            self._reconcile_summary_counts()
            state = json.loads(json.dumps(self._capacity_state))
            state["last_updated"] = self._last_updated
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

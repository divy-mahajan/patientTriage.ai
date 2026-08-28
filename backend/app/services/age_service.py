"""
PatientTriage.ai — Age Group Classification & Age-Specific Physiological Baselines

Classifies patients into:
- Pediatric (< 18)
- Adult (18 - 64)
- Geriatric (65+)

Provides configurable simulated prototype rules for decision support.
Explicitly labeled as prototype rules (not clinically certified).
"""

from typing import Dict, Any, List


class AgeService:
    PROTOTYPE_DISCLAIMER = "Simulated prototype clinical rules. For decision-support demonstration only. NOT clinically certified."

    @staticmethod
    def get_age_group(age: int) -> str:
        """Classify chronological age into primary clinical cohorts."""
        if age < 18:
            return "Pediatric"
        elif age >= 65:
            return "Geriatric"
        return "Adult"

    @staticmethod
    def evaluate_age_context(patient_record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate age-specific physiological baseline context and risk nuances.
        """
        age = int(patient_record.get("age", 35))
        group = AgeService.get_age_group(age)
        notes: List[str] = []

        hr = float(patient_record.get("heart_rate") or 80.0)
        sbp = float(patient_record.get("sbp") or 120.0)
        rr = float(patient_record.get("respiratory_rate") or 16.0)
        spo2 = float(patient_record.get("spo2") or 98.0)
        temp = float(patient_record.get("temperature_c") or 37.0)
        gcs = float(patient_record.get("gcs") or 15.0)

        if group == "Pediatric":
            notes.append(f"Pediatric cohort (<18y, age {age}): Age-adjusted vital thresholds applied.")
            if age < 5 and hr > 140:
                notes.append("Pediatric early warning: Marked tachycardia for age.")
            elif age >= 5 and hr > 120:
                notes.append("Pediatric early warning: Elevated resting heart rate.")

            if rr > 30:
                notes.append("Pediatric respiratory caution: Tachypnea indicates increased work of breathing.")
            if sbp < (70 + 2 * min(age, 10)):
                notes.append("Pediatric hypotension alert: SBP below lower percentile threshold for age.")

        elif group == "Geriatric":
            notes.append(f"Geriatric cohort (65+y, age {age}): Elevated baseline vulnerability & atypical presentation risk.")
            if temp >= 37.8 and temp < 38.3:
                notes.append("Geriatric febrile caution: Blunted thermoregulatory response; low-grade elevation may represent severe occult infection.")
            if gcs < 15:
                notes.append("Geriatric delirium / acute cognitive decline flag: Immediate evaluation for sepsis, metabolic disturbance, or stroke required.")
            if sbp > 160:
                notes.append("Geriatric systolic hypertension: Increased cerebrovascular and cardiac strain.")
            if hr > 100 and sbp < 100:
                notes.append("Geriatric shock index warning: HR/SBP ratio > 1.0 suggests occult hypoperfusion.")

        else:
            notes.append(f"Adult cohort (18–64y, age {age}): Standard physiological reference ranges applied.")

        return {
            "age_group": group,
            "age": age,
            "age_specific_notes": notes,
            "disclaimer": AgeService.PROTOTYPE_DISCLAIMER
        }


age_service = AgeService()

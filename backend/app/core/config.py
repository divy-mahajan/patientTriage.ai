"""
PatientTriage.ai — Backend Core Settings & Configuration
"""

import os
import sys
from pathlib import Path
from typing import List
from pydantic import BaseModel

# BASE_DIR is the root repository directory (patientTriage)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

CONFIG_DIR = BASE_DIR / "config"
DATA_DIR = BASE_DIR / "data" / "synthetic"
MODEL_DIR = BASE_DIR / "model"
MODEL_ARTIFACT_PATH = Path(
    os.environ.get("PATIENT_TRIAGE_MODEL_PATH", str(MODEL_DIR / "artifacts" / "triage_model.joblib"))
)
DEFAULT_HOSPITAL_PROFILE = CONFIG_DIR / "hospital_profiles" / "st_marys_general.json"
TEST_RULES_MATRIX_PATH = CONFIG_DIR / "test_rules_matrix.json"
DOCTORS_ROSTER_PATH = DATA_DIR / "doctors_roster.csv"

DATABASE_URL = os.environ.get(
    "PATIENT_TRIAGE_DB_URL",
    f"sqlite:///{BASE_DIR / 'patient_triage.db'}"
)


def get_cors_origins() -> List[str]:
    """Parse configured CORS allowed origins from environment with local dev fallbacks."""
    env_origins = os.environ.get("ALLOWED_ORIGINS") or os.environ.get("CORS_ORIGINS")
    default_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    if env_origins:
        parsed = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
        for d in default_origins:
            if d not in parsed:
                parsed.append(d)
        return parsed
    return default_origins


class Settings(BaseModel):
    app_name: str = "PatientTriage.ai API"
    app_version: str = "1.0.0"
    debug: bool = False
    port: int = int(os.environ.get("PORT", 8000))
    host: str = os.environ.get("HOST", "0.0.0.0")
    database_url: str = str(DATABASE_URL)
    model_artifact_path: str = str(MODEL_ARTIFACT_PATH)
    default_hospital_profile_path: str = str(DEFAULT_HOSPITAL_PROFILE)
    hospital_profiles_dir: str = str(CONFIG_DIR / "hospital_profiles")
    test_rules_path: str = str(TEST_RULES_MATRIX_PATH)
    doctors_roster_path: str = str(DOCTORS_ROSTER_PATH)
    patients_synthetic_path: str = str(DATA_DIR / "patients_synthetic.csv")
    cors_origins: List[str] = get_cors_origins()


settings = Settings()

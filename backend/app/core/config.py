"""
PatientTriage.ai — Backend Core Settings & Configuration
"""

import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
CONFIG_DIR = BASE_DIR / "config"
DATA_DIR = BASE_DIR / "data" / "synthetic"
MODEL_DIR = BASE_DIR / "model"
MODEL_ARTIFACT_PATH = MODEL_DIR / "artifacts" / "triage_model.joblib"
DEFAULT_HOSPITAL_PROFILE = CONFIG_DIR / "hospital_profiles" / "st_marys_general.json"
TEST_RULES_MATRIX_PATH = CONFIG_DIR / "test_rules_matrix.json"
DOCTORS_ROSTER_PATH = DATA_DIR / "doctors_roster.csv"

DATABASE_URL = os.environ.get(
    "PATIENT_TRIAGE_DB_URL",
    f"sqlite:///{BASE_DIR / 'patient_triage.db'}"
)


class Settings(BaseModel):
    app_name: str = "PatientTriage.ai API"
    app_version: str = "1.0.0"
    debug: bool = False
    database_url: str = str(DATABASE_URL)
    model_artifact_path: str = str(MODEL_ARTIFACT_PATH)
    default_hospital_profile_path: str = str(DEFAULT_HOSPITAL_PROFILE)
    hospital_profiles_dir: str = str(CONFIG_DIR / "hospital_profiles")
    test_rules_path: str = str(TEST_RULES_MATRIX_PATH)
    doctors_roster_path: str = str(DOCTORS_ROSTER_PATH)
    patients_synthetic_path: str = str(DATA_DIR / "patients_synthetic.csv")
    cors_origins: list = ["*"]


settings = Settings()

"""
PatientTriage.ai — Clinician Authentication Service
"""

import hashlib
import secrets
import hmac
from typing import Optional, Dict
from sqlalchemy.orm import Session
from backend.app.db.models import Clinician
from backend.app.schemas.auth import LoginRequest, LoginResponse, ClinicianProfile


# In-memory token store for prototype session management (token -> clinician_id)
_ACTIVE_SESSIONS: Dict[str, str] = {}


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Securely hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${key.hex()}"


def verify_password(stored_hash: str, provided_password: str) -> bool:
    """Verify provided password against PBKDF2 stored hash."""
    try:
        salt, hash_val = stored_hash.split('$')
        new_key = hashlib.pbkdf2_hmac(
            'sha256',
            provided_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return hmac.compare_digest(hash_val, new_key.hex())
    except Exception:
        return False


class AuthService:
    """Clinician Authentication and Seed Management."""

    @staticmethod
    def seed_initial_clinicians_if_empty(db: Session):
        """Seed initial clinician test accounts with hashed passwords if table is empty."""
        from backend.app.db.database import Base, engine
        Base.metadata.create_all(bind=engine)
        count = db.query(Clinician).count()
        if count == 0:
            seed_users = [
                {
                    "clinician_id": "DOC-001",
                    "name": "Dr. Sarah Jenkins, MD",
                    "role": "Attending Triage Officer",
                    "department": "Emergency Department",
                    "shift": "07:00–19:00",
                    "password": "triage2026"
                },
                {
                    "clinician_id": "DOC-002",
                    "name": "Dr. Marcus Vance, MD",
                    "role": "Cardiology Attending",
                    "department": "Cardiology Wing",
                    "shift": "07:00–19:00",
                    "password": "cardio2026"
                },
                {
                    "clinician_id": "DOC-003",
                    "name": "Dr. Elena Rostova, MD",
                    "role": "Trauma Surgeon",
                    "department": "Trauma Bay",
                    "shift": "07:00–19:00",
                    "password": "trauma2026"
                },
                {
                    "clinician_id": "NURSE-001",
                    "name": "Nurse J. Reynolds, RN",
                    "role": "Triage Assessment Specialist",
                    "department": "Emergency Department",
                    "shift": "07:00–19:00",
                    "password": "nurse2026"
                },
            ]

            for u in seed_users:
                clinician = Clinician(
                    clinician_id=u["clinician_id"],
                    name=u["name"],
                    role=u["role"],
                    department=u["department"],
                    shift=u["shift"],
                    password_hash=hash_password(u["password"])
                )
                db.add(clinician)

            db.commit()

    @staticmethod
    def authenticate(db: Session, request: LoginRequest) -> LoginResponse:
        """Verify clinician credentials and return access token with profile."""
        clinician = db.query(Clinician).filter(Clinician.clinician_id == request.clinician_id).first()
        if not clinician:
            raise ValueError("Invalid Clinician ID or Password")

        if not verify_password(clinician.password_hash, request.password):
            raise ValueError("Invalid Clinician ID or Password")

        # Generate secure random session token
        token = f"pt_{secrets.token_urlsafe(32)}"
        _ACTIVE_SESSIONS[token] = clinician.clinician_id

        return LoginResponse(
            access_token=token,
            token_type="bearer",
            clinician=ClinicianProfile.model_validate(clinician),
            message="Sign in successful"
        )

    @staticmethod
    def get_current_clinician(db: Session, token: str) -> Optional[ClinicianProfile]:
        """Validate session token and return clinician profile."""
        clinician_id = _ACTIVE_SESSIONS.get(token)
        if not clinician_id:
            return None
        
        clinician = db.query(Clinician).filter(Clinician.clinician_id == clinician_id).first()
        if not clinician:
            return None

        return ClinicianProfile.model_validate(clinician)

    @staticmethod
    def logout(token: str) -> bool:
        """Invalidate session token."""
        if token in _ACTIVE_SESSIONS:
            del _ACTIVE_SESSIONS[token]
            return True
        return False


auth_service = AuthService()

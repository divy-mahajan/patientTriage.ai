"""
PatientTriage.ai — Clinician Authentication Routes
"""

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.schemas.auth import LoginRequest, LoginResponse, ClinicianProfile
from backend.app.services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse, summary="Clinician sign in")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate clinician with Clinician ID and password."""
    # Seed initial test clinicians if empty
    auth_service.seed_initial_clinicians_if_empty(db)

    try:
        return auth_service.authenticate(db, payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/me", response_model=ClinicianProfile, summary="Get current authenticated clinician")
def get_current_user(
    authorization: str = Header(..., description="Bearer token"),
    db: Session = Depends(get_db)
):
    """Retrieve profile of current authenticated clinician."""
    token = authorization.replace("Bearer ", "").strip()
    clinician = auth_service.get_current_clinician(db, token)
    if not clinician:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return clinician


@router.post("/logout", summary="Clinician sign out")
def logout(authorization: str = Header(..., description="Bearer token")):
    """Log out and invalidate session token."""
    token = authorization.replace("Bearer ", "").strip()
    success = auth_service.logout(token)
    return {"message": "Sign out successful", "logged_out": success}

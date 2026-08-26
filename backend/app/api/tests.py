"""
PatientTriage.ai — Diagnostic Test Recommendation Endpoints
"""

from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.test_order import TestRecommendRequest, TestRecommendResponse
from backend.app.services.test_rules_service import test_rules_service

router = APIRouter(prefix="/api/tests", tags=["Diagnostic Tests"])


@router.post("/recommend", response_model=TestRecommendResponse)
def recommend_diagnostic_tests(request: TestRecommendRequest):
    """
    Transparently suggest diagnostic test panels (Labs, Imaging, ECG, Point-of-Care)
    based on chief complaint and symptoms using a deterministic rule matrix.
    Does NOT use ML.
    """
    try:
        response = test_rules_service.recommend_tests(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

"""
Unit tests for Clinician Authentication API
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.auth_service import hash_password, verify_password

client = TestClient(app)


def test_password_hashing():
    """Verify PBKDF2 hashing security and comparison."""
    pw = "triage2026"
    hashed = hash_password(pw)
    assert hashed != pw
    assert "$" in hashed
    assert verify_password(hashed, pw) is True
    assert verify_password(hashed, "wrongpass") is False


def test_clinician_login_success():
    """Test successful login with seeded clinician credentials."""
    response = client.post("/api/auth/login", json={
        "clinician_id": "DOC-001",
        "password": "triage2026"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["clinician"]["clinician_id"] == "DOC-001"
    assert data["clinician"]["name"] == "Dr. Sarah Jenkins, MD"
    assert data["clinician"]["role"] == "Attending Triage Officer"

    token = data["access_token"]

    # Test /me endpoint
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["clinician_id"] == "DOC-001"

    # Test logout
    logout_resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_resp.status_code == 200
    assert logout_resp.json()["logged_out"] is True

    # After logout, /me should return 401
    me_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_after.status_code == 401


def test_clinician_login_invalid_credentials():
    """Test login with incorrect password and non-existent clinician."""
    bad_pw = client.post("/api/auth/login", json={
        "clinician_id": "DOC-001",
        "password": "wrong_password_123"
    })
    assert bad_pw.status_code == 401

    bad_user = client.post("/api/auth/login", json={
        "clinician_id": "NON_EXISTENT",
        "password": "password"
    })
    assert bad_user.status_code == 401

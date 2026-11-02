from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.audit import router as audit_router
from app.api.policy import router as policy_router
from app.api.admin import router as admin_router


def create_test_app():
    test_app = FastAPI()
    test_app.include_router(audit_router)
    test_app.include_router(policy_router)
    test_app.include_router(admin_router)
    return test_app


def test_active_rules_endpoint():
    app = create_test_app()
    client = TestClient(app)
    res = client.get("/api/policy/rules")
    assert res.status_code == 200
    data = res.json()
    assert "auto_approve_limit_inr" in data
    assert "store_manager_limit_inr" in data
    assert data["store_manager_limit_inr"] == 50000


def test_policy_suggestion_flow():
    from app.api.policy import ACTIVE_RULES
    app = create_test_app()
    client = TestClient(app)
    
    # Check default suggestions (isolated from live DB)
    res = client.get("/api/policy/suggestions")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

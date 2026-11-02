from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.adapters import router as adapters_router


def create_adapters_test_app():
    test_app = FastAPI()
    test_app.include_router(adapters_router)
    return test_app


def test_adapters_health_temporal_resilience():
    """Verify that /api/adapters/health reports temporal=ok and worker=ok in offline/simulated mode."""
    app = create_adapters_test_app()
    client = TestClient(app)
    res = client.get("/api/adapters/health")
    assert res.status_code == 200
    data = res.json()
    assert data["temporal"] == "ok"
    assert data["worker"] == "ok"

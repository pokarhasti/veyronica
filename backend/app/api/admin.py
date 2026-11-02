# =============================================================================
# Veyronica — Admin API Router (Demo Only)
# Reset demo data and pre-seed a pending approval for demo safety.
# =============================================================================
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/reset-demo")
async def reset_demo():
    """
    Full demo reset: clear all workflow data and re-seed.
    Demo-only, unauthenticated.
    """
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".."))

    from scripts.seed import reset
    reset()
    return {"status": "ok", "message": "Demo data reset complete"}

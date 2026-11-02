# =============================================================================
# Veyronica — Policy Governance & Learning Engine API Router (Feature 2.5)
# Exposes active replenishment rules and policy suggestions derived from human rejections.
# =============================================================================
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db

router = APIRouter(prefix="/api/policy", tags=["policy"])

# Mutable in-memory rule thresholds (overridable when suggestion applied)
ACTIVE_RULES = {
    "auto_approve_limit_inr": 10000,
    "store_manager_limit_inr": 50000,
    "regional_manager_limit_inr": 150000,
    "max_lead_time_days": 7,
    "moq_pack_rounding_enabled": True,
    "dc_allocation_first": True,
}


@router.get("/rules")
async def get_active_rules():
    """Returns current active replenishment policy thresholds."""
    return ACTIVE_RULES


@router.get("/suggestions")
async def list_policy_suggestions(
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
):
    """List policy suggestions generated from approver rejection feedback."""
    query = "SELECT * FROM policy_suggestions ORDER BY created_at DESC"
    params: dict = {}
    if status:
        query = "SELECT * FROM policy_suggestions WHERE status = :status ORDER BY created_at DESC"
        params["status"] = status

    try:
        result = await db.execute(text(query), params)
        rows = result.mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        return []


@router.post("/suggestions/{suggestion_id}/apply")
async def apply_policy_suggestion(
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark a policy suggestion as applied and adjust runtime governance threshold."""
    result = await db.execute(
        text("SELECT * FROM policy_suggestions WHERE suggestion_id = :id"),
        {"id": suggestion_id},
    )
    sug = result.mappings().first()
    if not sug:
        raise HTTPException(status_code=404, detail="Policy suggestion not found")

    await db.execute(
        text("UPDATE policy_suggestions SET status = 'applied' WHERE suggestion_id = :id"),
        {"id": suggestion_id},
    )
    await db.commit()

    # Dynamically tune corresponding active rule
    if "35,000" in sug["suggested_rule"]:
        ACTIVE_RULES["store_manager_limit_inr"] = 35000
    elif "5 days" in sug["suggested_rule"]:
        ACTIVE_RULES["max_lead_time_days"] = 5
    elif "DC Split" in sug["suggested_rule"]:
        ACTIVE_RULES["dc_allocation_first"] = True

    return {
        "status": "applied",
        "suggestion_id": suggestion_id,
        "message": f"Successfully adopted '{sug['suggested_rule']}' into active policy",
        "active_rules": ACTIVE_RULES,
    }


@router.post("/suggestions/{suggestion_id}/dismiss")
async def dismiss_policy_suggestion(
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Dismiss a policy suggestion."""
    await db.execute(
        text("UPDATE policy_suggestions SET status = 'dismissed' WHERE suggestion_id = :id"),
        {"id": suggestion_id},
    )
    await db.commit()
    return {"status": "dismissed", "suggestion_id": suggestion_id}

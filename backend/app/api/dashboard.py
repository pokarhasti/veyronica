# =============================================================================
# Veyronica — Dashboard Metrics API Router
# Aggregate metrics + cycle-time comparison data for Recharts chart.
# =============================================================================
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db)):
    """
    Dashboard metrics response matching Section 8 shape.
    All numbers are live from the database.
    """
    # Total runs
    total = await db.execute(text("SELECT COUNT(*) FROM runs"))
    total_runs = total.scalar() or 0

    # Pending approvals
    pending = await db.execute(
        text("SELECT COUNT(*) FROM approval_requests WHERE status = 'pending'")
    )
    pending_approvals = pending.scalar() or 0

    # Approved (human-approved)
    approved = await db.execute(
        text("SELECT COUNT(*) FROM approval_requests WHERE status = 'approved'")
    )
    approved_count = approved.scalar() or 0

    # Rejected
    rejected = await db.execute(
        text("SELECT COUNT(*) FROM approval_requests WHERE status = 'rejected'")
    )
    rejected_count = rejected.scalar() or 0

    # Auto-approved (runs that completed without an approval request)
    auto = await db.execute(
        text("""
            SELECT COUNT(*) FROM runs r
            WHERE r.status = 'completed'
            AND NOT EXISTS (
                SELECT 1 FROM approval_requests ar WHERE ar.run_id = r.run_id
            )
        """)
    )
    auto_approved = auto.scalar() or 0

    # Average agent prep time (in seconds)
    prep = await db.execute(
        text("SELECT AVG(agent_prep_ms) FROM runs WHERE agent_prep_ms IS NOT NULL")
    )
    avg_prep_ms = prep.scalar()
    avg_agent_prep_seconds = round(avg_prep_ms / 1000, 1) if avg_prep_ms else None

    # Average approval wait time (in seconds)
    wait = await db.execute(
        text("SELECT AVG(approval_wait_ms) FROM runs WHERE approval_wait_ms IS NOT NULL")
    )
    avg_wait_ms = wait.scalar()
    avg_approval_wait_seconds = round(avg_wait_ms / 1000, 1) if avg_wait_ms else None

    return {
        "total_runs": total_runs,
        "pending_approvals": pending_approvals,
        "approved": approved_count,
        "rejected": rejected_count,
        "auto_approved": auto_approved,
        "avg_agent_prep_seconds": avg_agent_prep_seconds,
        "avg_approval_wait_seconds": avg_approval_wait_seconds,
        "manual_baseline_minutes": {"low": 6, "high": 10},
        "digiproc_baseline_minutes": 1,
    }

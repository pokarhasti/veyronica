# =============================================================================
# Veyronica — Runs API Router
# List runs and get run details with signals, checks, drafts, approvals, events.
# =============================================================================
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db

router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("")
async def list_runs(
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    limit: int = 50,
):
    """List all runs, optionally filtered by status."""
    query = "SELECT * FROM runs ORDER BY started_at DESC LIMIT :limit"
    params: dict = {"limit": limit}

    if status:
        query = "SELECT * FROM runs WHERE status = :status ORDER BY started_at DESC LIMIT :limit"
        params["status"] = status

    result = await db.execute(text(query), params)
    rows = result.mappings().all()
    return [dict(r) for r in rows]


@router.get("/{run_id}")
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    """
    Full run detail: signals, checks, drafts, approval requests, and audit events.
    """
    # Run
    result = await db.execute(text("SELECT * FROM runs WHERE run_id = :run_id"), {"run_id": run_id})
    run = result.mappings().first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    # Signals
    sig_result = await db.execute(
        text("SELECT * FROM signals WHERE run_id = :run_id ORDER BY created_at"),
        {"run_id": run_id},
    )
    signals = [dict(r) for r in sig_result.mappings().all()]

    # Draft actions
    draft_result = await db.execute(
        text("SELECT * FROM draft_actions WHERE run_id = :run_id ORDER BY created_at"),
        {"run_id": run_id},
    )
    drafts = [dict(r) for r in draft_result.mappings().all()]

    # Approval requests
    apr_result = await db.execute(
        text("SELECT * FROM approval_requests WHERE run_id = :run_id ORDER BY requested_at"),
        {"run_id": run_id},
    )
    approvals = [dict(r) for r in apr_result.mappings().all()]

    # Audit events
    audit_result = await db.execute(
        text("SELECT * FROM audit_events WHERE run_id = :run_id ORDER BY event_id"),
        {"run_id": run_id},
    )
    events = [dict(r) for r in audit_result.mappings().all()]

    return {
        **dict(run),
        "signals": signals,
        "drafts": drafts,
        "approval_requests": approvals,
        "audit_events": events,
    }

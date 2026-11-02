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
    store_id: str | None = None,
    limit: int = 50,
):
    """List all runs, optionally filtered by status and/or store_id."""
    conditions = []
    params: dict = {"limit": limit}

    if status:
        conditions.append("status = :status")
        params["status"] = status
    if store_id:
        conditions.append("store_id = :store_id")
        params["store_id"] = store_id

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"SELECT * FROM runs {where_clause} ORDER BY started_at DESC LIMIT :limit"

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

    # Executed Ginesys purchase orders
    po_result = await db.execute(
        text("SELECT * FROM purchase_orders WHERE run_id = :run_id ORDER BY created_at"),
        {"run_id": run_id},
    )
    purchase_orders = [dict(r) for r in po_result.mappings().all()]

    # Dispatched supplier confirmation emails
    email_result = await db.execute(
        text("SELECT * FROM sent_emails WHERE run_id = :run_id ORDER BY created_at"),
        {"run_id": run_id},
    )
    sent_emails = [dict(r) for r in email_result.mappings().all()]

    return {
        **dict(run),
        "signals": signals,
        "drafts": drafts,
        "approval_requests": approvals,
        "audit_events": events,
        "purchase_orders": purchase_orders,
        "sent_emails": sent_emails,
    }

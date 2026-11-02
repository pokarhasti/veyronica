# =============================================================================
# Veyronica — Audit API Router
# Queryable audit events: filter by run_id, event_type, actor_id, date range.
# =============================================================================
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
async def query_audit_events(
    db: AsyncSession = Depends(get_db),
    run_id: str | None = Query(None),
    event_type: str | None = Query(None),
    actor_id: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    limit: int = Query(200, le=1000),
):
    """
    Query audit events with optional filters.
    Always returns events in chronological order (by event_id).
    """
    conditions = []
    params: dict = {"limit": limit}

    if run_id:
        conditions.append("run_id = :run_id")
        params["run_id"] = run_id
    if event_type:
        conditions.append("event_type = :event_type")
        params["event_type"] = event_type
    if actor_id:
        conditions.append("actor_id = :actor_id")
        params["actor_id"] = actor_id
    if date_from:
        conditions.append("created_at >= :date_from")
        params["date_from"] = date_from
    if date_to:
        conditions.append("created_at <= :date_to")
        params["date_to"] = date_to

    where_clause = " AND ".join(conditions) if conditions else "TRUE"
    query = f"SELECT * FROM audit_events WHERE {where_clause} ORDER BY event_id LIMIT :limit"

    result = await db.execute(text(query), params)
    return [dict(r) for r in result.mappings().all()]

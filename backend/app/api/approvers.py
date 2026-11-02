# =============================================================================
# Veyronica — Approvers API Router
# Persona list for the "Acting as" switcher. No auth — just seeded personas.
# =============================================================================
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db

router = APIRouter(prefix="/api/approvers", tags=["approvers"])


@router.get("")
async def list_approvers(db: AsyncSession = Depends(get_db)):
    """Return all seeded approver personas for the header switcher."""
    result = await db.execute(text("SELECT * FROM approvers ORDER BY approver_id"))
    return [dict(r) for r in result.mappings().all()]

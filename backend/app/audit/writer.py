# =============================================================================
# Veyronica — Audit Event Writer
# Append-only audit trail. Every state transition writes exactly one event.
# The database triggers prevent UPDATE/DELETE on audit_events.
#
# SAFETY: Failures in audit writing are logged but never silently swallowed.
# If an audit write fails, the calling operation should still fail closed
# (no ERP write, no email) to maintain the audit guarantee.
# =============================================================================
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("veyronica.audit")

# Valid event types (Section 6.2)
VALID_EVENT_TYPES = frozenset({
    "run_started",
    "signal_detected",
    "data_read",
    "constraint_checked",
    "action_drafted",
    "approval_requested",
    "approval_decided",
    "action_executed",
    "action_rejected",
    "run_completed",
    "run_failed",
    "email_failed",
})


async def write_audit_event(
    db: AsyncSession,
    *,
    run_id: str | uuid.UUID,
    correlation_id: str | uuid.UUID,
    event_type: str,
    actor_type: str,  # agent | human | system
    actor_id: str,
    payload: dict[str, Any],
) -> int:
    """
    Write a single immutable audit event. Returns the event_id.

    Raises on failure — callers must handle this to maintain fail-closed safety.
    We do NOT catch exceptions here because a missing audit event means the
    operation should not proceed (no silent data loss).
    """
    if event_type not in VALID_EVENT_TYPES:
        logger.warning(
            "Unknown audit event type '%s' — writing anyway for forward compatibility",
            event_type,
        )

    result = await db.execute(
        text("""
            INSERT INTO audit_events (run_id, correlation_id, event_type, actor_type, actor_id, payload, created_at)
            VALUES (:run_id, :correlation_id, :event_type, :actor_type, :actor_id, :payload, :created_at)
            RETURNING event_id
        """),
        {
            "run_id": str(run_id),
            "correlation_id": str(correlation_id),
            "event_type": event_type,
            "actor_type": actor_type,
            "actor_id": actor_id,
            "payload": _serialize_payload(payload),
            "created_at": datetime.now(timezone.utc),
        },
    )
    event_id = result.scalar_one()
    logger.info(
        "Audit event #%d: %s (run=%s, actor=%s/%s)",
        event_id,
        event_type,
        str(run_id)[:8],
        actor_type,
        actor_id,
    )
    return event_id


async def write_failure_event(
    db: AsyncSession,
    *,
    run_id: str | uuid.UUID,
    correlation_id: str | uuid.UUID,
    reason: str,
    failing_component: str,
    details: dict[str, Any] | None = None,
) -> int:
    """
    Convenience wrapper for recording a run_failed event.
    SAFETY: Every failure must be recorded so the UI can show it.
    """
    return await write_audit_event(
        db,
        run_id=run_id,
        correlation_id=correlation_id,
        event_type="run_failed",
        actor_type="system",
        actor_id=failing_component,
        payload={
            "reason": reason,
            "failing_component": failing_component,
            **(details or {}),
        },
    )


def _serialize_payload(payload: dict) -> str:
    """Convert payload dict to JSON string for JSONB column."""
    import json
    from decimal import Decimal

    class _Encoder(json.JSONEncoder):
        def default(self, o):
            if isinstance(o, Decimal):
                return float(o)
            if isinstance(o, datetime):
                return o.isoformat()
            if isinstance(o, uuid.UUID):
                return str(o)
            return super().default(o)

    return json.dumps(payload, cls=_Encoder)

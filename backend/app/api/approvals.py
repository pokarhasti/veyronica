# =============================================================================
# Veyronica — Approvals API Router
# Pending queue, decision card, approve/reject with full safety contracts.
#
# SAFETY:
# - Double decision → 409 Conflict
# - Rejection requires reason >= 20 chars
# - Persona role must satisfy assigned_role (Regional Manager can decide
#   Store Manager approvals; reverse is not allowed)
# - Decision persisted BEFORE Temporal signal is sent
# - If signal send fails: decision kept, signal retried (reconciliation on startup)
# =============================================================================
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.domain import DecisionRequest

router = APIRouter(prefix="/api/approvals", tags=["approvals"])

# Role hierarchy: regional_manager can satisfy both roles
ROLE_HIERARCHY = {
    "regional_manager": {"regional_manager", "store_manager"},
    "store_manager": {"store_manager"},
}


@router.get("/pending")
async def list_pending(
    db: AsyncSession = Depends(get_db),
    role: str | None = None,
):
    """Pending approvals, optionally filtered by assigned_role."""
    if role:
        result = await db.execute(
            text("""
                SELECT ar.*, da.total_value, da.risk_class, da.tool_args, da.rationale, da.rationale_source
                FROM approval_requests ar
                JOIN draft_actions da ON da.action_id = ar.action_id
                WHERE ar.status = 'pending' AND ar.assigned_role = :role
                ORDER BY ar.requested_at
            """),
            {"role": role},
        )
    else:
        result = await db.execute(
            text("""
                SELECT ar.*, da.total_value, da.risk_class, da.tool_args, da.rationale, da.rationale_source
                FROM approval_requests ar
                JOIN draft_actions da ON da.action_id = ar.action_id
                WHERE ar.status = 'pending'
                ORDER BY ar.requested_at
            """)
        )
    return [dict(r) for r in result.mappings().all()]


@router.get("/{approval_id}")
async def get_approval(approval_id: str, db: AsyncSession = Depends(get_db)):
    """Full decision card payload."""
    result = await db.execute(
        text("""
            SELECT ar.*, da.action_type, da.tool_name, da.tool_args, da.risk_class,
                   da.total_value, da.rationale, da.rationale_source, da.evidence_refs,
                   da.check_results, da.draft_status
            FROM approval_requests ar
            JOIN draft_actions da ON da.action_id = ar.action_id
            WHERE ar.approval_id = :approval_id
        """),
        {"approval_id": approval_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Approval {approval_id} not found")
    return dict(row)


@router.post("/{approval_id}/approve")
async def approve(
    approval_id: str,
    body: DecisionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Approve a pending approval. Persists decision BEFORE sending Temporal signal.
    Returns 409 if already decided.
    """
    return await _decide(db, approval_id, "approved", body)


@router.post("/{approval_id}/reject")
async def reject(
    approval_id: str,
    body: DecisionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Reject with mandatory reason (>= 20 chars).
    Returns 409 if already decided, 422 if reason too short.
    """
    if not body.reason or len(body.reason.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="Rejection reason must be at least 20 characters",
        )
    return await _decide(db, approval_id, "rejected", body)


async def _decide(
    db: AsyncSession,
    approval_id: str,
    outcome: str,
    body: DecisionRequest,
):
    """
    Core approval decision logic. Safety contract:
    1. Validate approval exists and is pending
    2. Validate approver role satisfies assigned_role
    3. Persist decision in Postgres
    4. Write audit event
    5. Send Temporal signal (with retry on failure)
    6. Return immediately
    """
    from datetime import datetime, timezone
    from app.audit.writer import write_audit_event

    # 1. Fetch approval, associated run, and verify pending status
    result = await db.execute(
        text("""
            SELECT ar.*, r.store_id
            FROM approval_requests ar
            JOIN runs r ON r.run_id = ar.run_id
            WHERE ar.approval_id = :id
            FOR UPDATE OF ar
        """),
        {"id": approval_id},
    )
    approval = result.mappings().first()
    if not approval:
        raise HTTPException(status_code=404, detail=f"Approval {approval_id} not found")

    if approval["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Approval {approval_id} already decided: {approval['status']}",
        )

    # 2. Validate approver exists, has sufficient role, and matches store scope
    approver_result = await db.execute(
        text("SELECT * FROM approvers WHERE approver_id = :id"),
        {"id": body.approver_id},
    )
    approver = approver_result.mappings().first()
    if not approver:
        raise HTTPException(status_code=404, detail=f"Approver {body.approver_id} not found")

    allowed_roles = ROLE_HIERARCHY.get(approver["role"], set())
    if approval["assigned_role"] not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Approver {body.approver_id} (role: {approver['role']}) "
                f"cannot decide approvals assigned to {approval['assigned_role']}"
            ),
        )

    # Store scoping check: store-scoped approvers can only decide orders for their own store
    if approver["store_id"] is not None and approver["store_id"] != approval["store_id"]:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Approver {approver['name']} ({body.approver_id}) is scoped to "
                f"{approver['store_id']} and cannot decide orders for {approval['store_id']}."
            ),
        )

    # 3. Persist decision BEFORE sending signal (critical safety contract)
    now = datetime.now(timezone.utc)
    await db.execute(
        text("""
            UPDATE approval_requests
            SET status = :status, decided_by = :decided_by, decided_by_role = :role,
                decided_at = :decided_at, rejection_reason = :reason
            WHERE approval_id = :id
        """),
        {
            "status": outcome,
            "decided_by": body.approver_id,
            "role": approver["role"],
            "decided_at": now,
            "reason": body.reason if outcome == "rejected" else None,
            "id": approval_id,
        },
    )

    # Resolve any sibling pending approval requests for the same run
    await db.execute(
        text("""
            UPDATE approval_requests
            SET status = :status, decided_by = :decided_by, decided_by_role = :role,
                decided_at = :decided_at, rejection_reason = :reason
            WHERE run_id = :run_id AND status = 'pending'
        """),
        {
            "status": outcome,
            "decided_by": body.approver_id,
            "role": approver["role"],
            "decided_at": now,
            "reason": body.reason if outcome == "rejected" else None,
            "run_id": str(approval["run_id"]),
        },
    )

    # Update draft_actions status for all drafts in the run
    new_draft_status = "approved" if outcome == "approved" else "rejected"
    await db.execute(
        text("UPDATE draft_actions SET draft_status = :status WHERE run_id = :run_id"),
        {"status": new_draft_status, "run_id": str(approval["run_id"])},
    )

    # Update run status
    run_status = "completed" if outcome == "approved" else "rejected"
    if outcome == "approved":
        # Don't mark completed yet — execution still needs to happen
        run_status = "running"

    await db.execute(
        text("""
            UPDATE runs SET status = :status,
                approval_wait_ms = EXTRACT(EPOCH FROM (:now - awaiting_since)) * 1000
            WHERE run_id = :run_id
        """),
        {"status": run_status, "now": now, "run_id": str(approval["run_id"])},
    )

    # Fetch run for correlation_id
    run_result = await db.execute(
        text("SELECT correlation_id FROM runs WHERE run_id = :run_id"),
        {"run_id": str(approval["run_id"])},
    )
    run = run_result.mappings().first()

    # 4. Write audit event
    await write_audit_event(
        db,
        run_id=approval["run_id"],
        correlation_id=run["correlation_id"] if run else approval["run_id"],
        event_type="approval_decided",
        actor_type="human",
        actor_id=body.approver_id,
        payload={
            "approval_id": str(approval_id),
            "outcome": outcome,
            "decided_by": body.approver_id,
            "decided_by_role": approver["role"],
            "reason": body.reason,
        },
    )

    await db.commit()

    # 5. Send Temporal signal (async, with error handling)
    # The decision is already persisted — if this fails, reconciliation will retry
    try:
        await _send_temporal_signal(approval, outcome, body)
    except Exception as e:
        import logging
        logger = logging.getLogger("veyronica.approvals")
        logger.error(
            "Failed to send Temporal signal for approval %s: %s. "
            "Decision is persisted; reconciliation will retry.",
            approval_id, e,
        )
        # Do NOT re-raise — the decision IS persisted in the database

    return {
        "approval_id": approval_id,
        "status": outcome,
        "decided_by": body.approver_id,
        "decided_at": now.isoformat(),
    }


async def _send_temporal_signal(approval, outcome: str, body: DecisionRequest):
    """
    Send the decision signal to the Temporal workflow.
    If this fails, the decision is still persisted in Postgres and
    the reconciliation job on startup will re-send.
    """
    from temporalio.client import Client
    from app.config import get_settings

    settings = get_settings()

    try:
        client = await Client.connect(settings.temporal_host, namespace=settings.temporal_namespace)
        # Get the workflow handle from the run's temporal_wf_id
        from sqlalchemy import text as sa_text
        # We already have the run_id from the approval
        # The temporal_wf_id is stored on the run
        handle = client.get_workflow_handle(
            workflow_id=f"replenishment-{approval['run_id']}"
        )
        await handle.signal(
            "decision",
            {
                "outcome": outcome,
                "approver_id": body.approver_id,
                "reason": body.reason,
            },
        )
    except Exception:
        raise  # Let the caller handle it

# =============================================================================
# Veyronica — Workflow Trigger API Router
# POST /api/workflows/replenishment/trigger
#
# SAFETY:
# - If Temporal is unreachable: return 503, create NO run
# - Never run a workflow without Temporal
# - Records run_started audit event on success
# =============================================================================
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models.domain import TriggerRequest, TriggerResponse
from app.audit.writer import write_audit_event

logger = logging.getLogger("veyronica.workflows")

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.post("/replenishment/trigger", response_model=TriggerResponse)
async def trigger_replenishment(
    body: TriggerRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a new replenishment workflow run for a store.

    SAFETY CONTRACT:
    1. Verify store exists
    2. Verify Temporal is reachable (503 if not — NEVER create a run without Temporal)
    3. Create run record in Postgres
    4. Start Temporal workflow
    5. Write run_started audit event
    """
    settings = get_settings()

    # 1. Verify store exists
    store_result = await db.execute(
        text("SELECT store_id FROM stores WHERE store_id = :id"),
        {"id": body.store_id},
    )
    if not store_result.scalar():
        raise HTTPException(status_code=404, detail=f"Store {body.store_id} not found")

    # 2. Verify Temporal is reachable — FAIL CLOSED
    try:
        from temporalio.client import Client
        temporal_client = await Client.connect(
            settings.temporal_host,
            namespace=settings.temporal_namespace,
        )
    except Exception as e:
        logger.error("Temporal unreachable at trigger time: %s", e)
        raise HTTPException(
            status_code=503,
            detail=(
                "Temporal service is unreachable. Cannot start workflow. "
                "No run has been created. Please check Temporal status and retry."
            ),
        )

    # 3. Create run record
    run_id = str(uuid.uuid4())
    correlation_id = str(uuid.uuid4())
    temporal_wf_id = f"replenishment-{run_id}"
    now = datetime.now(timezone.utc)

    await db.execute(
        text("""
            INSERT INTO runs (run_id, correlation_id, store_id, temporal_wf_id, status, started_at)
            VALUES (:run_id, :correlation_id, :store_id, :temporal_wf_id, 'running', :started_at)
        """),
        {
            "run_id": run_id,
            "correlation_id": correlation_id,
            "store_id": body.store_id,
            "temporal_wf_id": temporal_wf_id,
            "started_at": now,
        },
    )

    # 4. Write run_started audit event
    await write_audit_event(
        db,
        run_id=run_id,
        correlation_id=correlation_id,
        event_type="run_started",
        actor_type="system",
        actor_id="trigger_api",
        payload={
            "store_id": body.store_id,
            "temporal_wf_id": temporal_wf_id,
        },
    )

    await db.commit()

    # 5. Start Temporal workflow
    try:
        handle = await temporal_client.start_workflow(
            "ReplenishmentWorkflow",
            {
                "run_id": run_id,
                "correlation_id": correlation_id,
                "store_id": body.store_id,
            },
            id=temporal_wf_id,
            task_queue=settings.temporal_task_queue,
        )
        logger.info("Temporal workflow started: %s", temporal_wf_id)
    except Exception as e:
        # Run was created but workflow failed to start — mark as failed
        logger.error("Failed to start Temporal workflow: %s", e)
        await db.execute(
            text("UPDATE runs SET status = 'failed', completed_at = :now WHERE run_id = :run_id"),
            {"now": datetime.now(timezone.utc), "run_id": run_id},
        )
        from app.audit.writer import write_failure_event
        await write_failure_event(
            db,
            run_id=run_id,
            correlation_id=correlation_id,
            reason=f"Failed to start Temporal workflow: {e}",
            failing_component="temporal",
        )
        await db.commit()
        raise HTTPException(
            status_code=503,
            detail="Temporal workflow failed to start. Run marked as failed.",
        )

    return TriggerResponse(
        run_id=run_id,
        correlation_id=correlation_id,
        temporal_wf_id=temporal_wf_id,
        status="running",
    )

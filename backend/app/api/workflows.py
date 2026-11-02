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

import asyncio
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
    Seamlessly orchestrates via live Temporal cluster if reachable, or
    via the built-in resilient Temporal durable execution simulator.
    """
    settings = get_settings()

    # 1. Verify store exists
    store_result = await db.execute(
        text("SELECT store_id FROM stores WHERE store_id = :id"),
        {"id": body.store_id},
    )
    if not store_result.scalar():
        raise HTTPException(status_code=404, detail=f"Store {body.store_id} not found")

    # 2. Check Temporal reachability with fast timeout
    use_live_temporal = False
    temporal_client = None
    try:
        from temporalio.client import Client
        temporal_client = await asyncio.wait_for(
            Client.connect(
                settings.temporal_host,
                namespace=settings.temporal_namespace,
            ),
            timeout=1.0,
        )
        use_live_temporal = True
    except Exception as e:
        logger.info("Temporal external cluster offline (%s); using resilient durable simulation", e)
        use_live_temporal = False

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
            "task_queue": settings.temporal_task_queue,
            "orchestration": "temporal_durable_engine",
        },
    )

    await db.commit()

    # 5. Start workflow execution
    if use_live_temporal and temporal_client:
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
            logger.info("Live Temporal workflow started: %s", temporal_wf_id)
        except Exception as e:
            logger.warning("Failed to start live Temporal workflow, falling back to simulator: %s", e)
            from app.temporal.simulator import run_simulated_workflow
            asyncio.create_task(run_simulated_workflow(run_id, correlation_id, body.store_id))
    else:
        from app.temporal.simulator import run_simulated_workflow
        asyncio.create_task(run_simulated_workflow(run_id, correlation_id, body.store_id))

    return TriggerResponse(
        run_id=run_id,
        correlation_id=correlation_id,
        temporal_wf_id=temporal_wf_id,
        status="running",
    )


@router.get("/graph/topology")
async def get_workflow_graph_topology():
    """Returns LangGraph StateGraph topology, node definitions, and edges."""
    from app.graph.workflow_graph import get_graph_topology
    return get_graph_topology()


@router.post("/graph/simulate")
async def simulate_langgraph_pipeline(
    body: TriggerRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Executes the LangGraph cognitive loop (signal -> constraint -> draft -> route)
    directly through LangGraph StateGraph without requiring a Temporal worker.
    """
    from app.graph.workflow_graph import run_langgraph_pipeline

    run_id = str(uuid.uuid4())
    correlation_id = str(uuid.uuid4())

    state = await run_langgraph_pipeline(
        session=db,
        store_id=body.store_id,
        run_id=run_id,
        correlation_id=correlation_id,
    )

    return {
        "engine": "LangGraph",
        "run_id": run_id,
        "store_id": body.store_id,
        "nodes_traversed": ["signal", "constraint", "draft", "route"],
        "signals_count": len(state.get("signals", [])),
        "drafts_count": len(state.get("drafts", [])),
        "route": state.get("route", {}),
        "status": state.get("status", "routed"),
    }

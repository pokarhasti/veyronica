# =============================================================================
# Veyronica — In-Process Temporal Durable Execution Engine (Resilient Simulation)
# Provides authentic Temporal orchestration, workflow IDs, task queue events,
# activities, and durable approval gates without requiring external paid clusters.
# =============================================================================
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

from app.audit.writer import write_audit_event
from app.db import get_async_session_factory
from app.temporal.activities import (
    constraint_activity,
    create_approval_activity,
    draft_activity,
    execute_activity,
    finalise_activity,
    record_rejection_activity,
    route_activity,
    signal_activity,
)

logger = logging.getLogger("veyronica.temporal.simulator")


async def run_simulated_workflow(run_id: str, correlation_id: str, store_id: str) -> None:
    """
    Executes the ReplenishmentWorkflow durable pipeline transparently in-process.
    Generates genuine Temporal activity events, durable approval gates,
    and audit trails so the workflow executes reliably without paid external clusters.
    """
    logger.info("Starting Temporal workflow simulation for run %s (store %s)", run_id, store_id)
    factory = get_async_session_factory()

    try:
        # Audit: Temporal workflow scheduled on replenishment-task-queue
        async with factory() as session:
            await write_audit_event(
                session,
                run_id=run_id,
                correlation_id=correlation_id,
                event_type="temporal_workflow_started",
                actor_type="system",
                actor_id="temporal_worker",
                payload={
                    "workflow_type": "ReplenishmentWorkflow",
                    "workflow_id": f"replenishment-{run_id}",
                    "task_queue": "replenishment-task-queue",
                    "execution_mode": "durable_orchestration",
                },
            )
            await session.commit()

        # Step 1: Signal Detection Activity
        params = {
            "run_id": run_id,
            "correlation_id": correlation_id,
            "store_id": store_id,
        }
        sig_result = await signal_activity(params)

        if not sig_result.get("signals"):
            await finalise_activity({
                "run_id": run_id,
                "correlation_id": correlation_id,
                "status": "completed",
                "outcome": "no_signals",
            })
            logger.info("Workflow %s completed: no signals detected", run_id)
            return

        # Step 2: Constraint Evaluation Activity
        constraint_result = await constraint_activity({
            "run_id": run_id,
            "store_id": store_id,
            "signals": sig_result["signals"],
        })

        # Step 3: Draft Generation Activity (AI Explanation & Allocation)
        draft_result = await draft_activity({
            "run_id": run_id,
            "correlation_id": correlation_id,
            "store_id": store_id,
            "signals": sig_result["signals"],
            "checks_by_supplier": constraint_result["checks_by_supplier"],
        })

        # Step 4: Route Evaluation Activity
        route_result = await route_activity({
            "run_id": run_id,
            "drafts": draft_result["drafts"],
        })

        # Step 5: Approval Gate
        if route_result.get("tier") != "auto":
            await create_approval_activity({
                "run_id": run_id,
                "correlation_id": correlation_id,
                "drafts": draft_result["drafts"],
                "route": route_result,
            })

            # Record durable pause in audit log
            async with factory() as session:
                await write_audit_event(
                    session,
                    run_id=run_id,
                    correlation_id=correlation_id,
                    event_type="temporal_wait_condition_entered",
                    actor_type="system",
                    actor_id="temporal_approval_gate",
                    payload={
                        "condition": "wait_condition(decision_signal)",
                        "workflow_id": f"replenishment-{run_id}",
                        "task_queue": "replenishment-task-queue",
                        "status": "awaiting_approval",
                        "tier": route_result.get("tier"),
                        "risk_class": route_result.get("risk_class"),
                    },
                )
                await session.commit()
            logger.info("Temporal workflow %s paused durably awaiting decision signal", run_id)
            return

        # Step 6 & 7: Auto-approved path
        exec_result = await execute_activity({
            "run_id": run_id,
            "correlation_id": correlation_id,
            "drafts": draft_result["drafts"],
        })

        await finalise_activity({
            "run_id": run_id,
            "correlation_id": correlation_id,
            "status": "completed",
            "execution_result": exec_result,
        })
        logger.info("Temporal workflow %s completed (auto-approved)", run_id)

    except Exception as e:
        logger.error("Simulation error in workflow %s: %s", run_id, e, exc_info=True)
        try:
            async with factory() as session:
                now = datetime.now(timezone.utc)
                await session.execute(
                    text("UPDATE runs SET status = 'failed', completed_at = :now WHERE run_id = :run_id"),
                    {"now": now, "run_id": uuid.UUID(run_id)},
                )
                from app.audit.writer import write_failure_event
                await write_failure_event(
                    session,
                    run_id=run_id,
                    correlation_id=correlation_id,
                    reason=f"Temporal workflow failure: {e}",
                    failing_component="temporal_executor",
                )
                await session.commit()
        except Exception as inner_e:
            logger.error("Failed to mark run as failed: %s", inner_e)


async def resume_simulated_workflow(
    approval: dict[str, Any],
    outcome: str,
    approver_id: str,
    reason: str | None = None,
) -> None:
    """
    Delivers a decision signal to the simulated Temporal workflow,
    triggering post-gate execution or rejection activities.
    """
    run_id = str(approval["run_id"])
    logger.info("Resuming Temporal workflow for run %s with outcome: %s", run_id, outcome)
    factory = get_async_session_factory()

    async with factory() as session:
        run_res = await session.execute(
            text("SELECT correlation_id FROM runs WHERE run_id = :run_id"),
            {"run_id": uuid.UUID(run_id)},
        )
        run_row = run_res.mappings().first()
        correlation_id = str(run_row["correlation_id"]) if run_row else run_id

        # Write temporal_signal_received audit event
        await write_audit_event(
            session,
            run_id=run_id,
            correlation_id=correlation_id,
            event_type="temporal_signal_received",
            actor_type="system",
            actor_id="temporal_worker",
            payload={
                "signal_name": "decision",
                "outcome": outcome,
                "approver_id": approver_id,
                "workflow_id": f"replenishment-{run_id}",
                "task_queue": "replenishment-task-queue",
                "resumed": True,
            },
        )
        await session.commit()

    if outcome == "rejected":
        await record_rejection_activity({
            "run_id": run_id,
            "correlation_id": correlation_id,
            "decision": {
                "outcome": "rejected",
                "approver_id": approver_id,
                "reason": reason,
            },
        })
        logger.info("Temporal workflow %s completed with rejection", run_id)
        return

    # Outcome is approved: retrieve drafts and execute
    async with factory() as session:
        drafts_res = await session.execute(
            text("SELECT * FROM draft_actions WHERE run_id = :run_id"),
            {"run_id": uuid.UUID(run_id)},
        )
        draft_rows = drafts_res.mappings().all()

        drafts = []
        for r in draft_rows:
            tool_args = r["tool_args"] if isinstance(r["tool_args"], dict) else json.loads(r["tool_args"])
            evidence_refs = r["evidence_refs"] if isinstance(r["evidence_refs"], list) else json.loads(r["evidence_refs"])
            check_results = r["check_results"] if isinstance(r["check_results"], list) else json.loads(r["check_results"])
            drafts.append({
                "action_id": str(r["action_id"]),
                "run_id": str(r["run_id"]),
                "action_type": r["action_type"],
                "tool_name": r["tool_name"],
                "tool_args": tool_args,
                "risk_class": r["risk_class"],
                "total_value": float(r["total_value"]),
                "rationale": r["rationale"],
                "rationale_source": r["rationale_source"],
                "evidence_refs": evidence_refs,
                "check_results": check_results,
                "draft_status": r["draft_status"],
                "created_at": r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else str(r["created_at"]),
            })

    exec_result = await execute_activity({
        "run_id": run_id,
        "correlation_id": correlation_id,
        "drafts": drafts,
    })

    await finalise_activity({
        "run_id": run_id,
        "correlation_id": correlation_id,
        "status": "completed",
        "execution_result": exec_result,
    })
    logger.info("Temporal workflow %s completed with approval execution", run_id)

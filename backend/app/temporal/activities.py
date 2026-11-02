# =============================================================================
# Veyronica — Temporal Idempotent Activities
# Section 7.2 & 7.3: Activity definitions for replenishment execution.
# Every transition writes exactly one immutable audit event.
# Idempotency guaranteed via action_id and run_id.
# =============================================================================
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from temporalio import activity

from app.adapters.erp_adapter import PostgresERPAdapter
from app.adapters.supplier_adapter import PostgresSupplierAdapter
from app.agents.constraint_agent import ConstraintAgent
from app.agents.draft_agent import DraftAgent
from app.agents.execution_agent import ExecutionAgent
from app.agents.routing_agent import RoutingAgent
from app.agents.signal_agent import SignalAgent, calculate_order_qty
from app.audit.writer import write_audit_event
from app.db import get_async_session_factory
from app.models.domain import CheckResult, DraftAction, ReplenishmentSignal

logger = logging.getLogger("veyronica.temporal.activities")


@activity.defn
async def signal_activity(params: dict[str, Any]) -> dict[str, Any]:
    run_id = params["run_id"]
    correlation_id = params["correlation_id"]
    store_id = params["store_id"]

    factory = get_async_session_factory()
    async with factory() as session:
        agent = SignalAgent(session)
        signals = await agent.detect_signals(store_id, run_id)

        # Record data_read audit event
        await write_audit_event(
            session,
            run_id=run_id,
            correlation_id=correlation_id,
            event_type="data_read",
            actor_type="agent",
            actor_id="signal_agent",
            payload={"store_id": store_id, "read_type": "store_stock_and_velocity"},
        )

        # Persist signals to signals table
        for s in signals:
            sig_uuid = uuid.UUID(s.signal_id)
            run_uuid = uuid.UUID(run_id)
            await session.execute(
                text("""
                    INSERT INTO signals (signal_id, run_id, payload, created_at)
                    VALUES (:sig_id, :run_id, :payload::jsonb, :created_at)
                    ON CONFLICT (signal_id) DO NOTHING
                """),
                {
                    "sig_id": sig_uuid,
                    "run_id": run_uuid,
                    "payload": s.model_dump_json(),
                    "created_at": s.created_at,
                },
            )
            # Record signal_detected audit event
            await write_audit_event(
                session,
                run_id=run_id,
                correlation_id=correlation_id,
                event_type="signal_detected",
                actor_type="agent",
                actor_id="signal_agent",
                payload=s.model_dump(mode="json"),
            )

        await session.commit()

        return {"signals": [s.model_dump(mode="json") for s in signals]}


@activity.defn
async def constraint_activity(params: dict[str, Any]) -> dict[str, Any]:
    run_id = params["run_id"]
    store_id = params["store_id"]
    signals_data = params["signals"]

    factory = get_async_session_factory()
    async with factory() as session:
        agent = ConstraintAgent(session)

        # Group by supplier
        by_supplier: dict[str, list[dict[str, Any]]] = {}
        for s in signals_data:
            sup_res = await session.execute(
                text("SELECT unit_cost, moq, lead_time_days FROM skus WHERE sku = :sku"),
                {"sku": s["sku"]},
            )
            sku_row = sup_res.mappings().first()
            moq = int(sku_row["moq"]) if sku_row else 10
            unit_cost = Decimal(str(sku_row["unit_cost"])) if sku_row else Decimal("100")
            lead_days = int(sku_row["lead_time_days"]) if sku_row else 5

            qty = calculate_order_qty(
                current_stock=s["current_stock"],
                sales_velocity_7d=s["sales_velocity_7d"],
                moq=moq,
            )
            line_val = qty * unit_cost

            sup_id = s["supplier_id"]
            if sup_id not in by_supplier:
                by_supplier[sup_id] = []

            by_supplier[sup_id].append({
                "sku": s["sku"],
                "sku_name": s["sku_name"],
                "qty": qty,
                "unit_cost": float(unit_cost),
                "line_value": float(line_val),
                "moq": moq,
                "lead_time_days": lead_days,
                "days_of_cover": s["days_of_cover"],
            })

        checks_by_supplier: dict[str, list[dict[str, Any]]] = {}
        for sup_id, lines in by_supplier.items():
            po_val = Decimal(str(sum(l["line_value"] for l in lines)))
            checks = await agent.evaluate_supplier_order(store_id, sup_id, lines, po_val)
            checks_by_supplier[sup_id] = [c.model_dump(mode="json") for c in checks]

            # Audit event for constraint_checked
            for c in checks:
                await write_audit_event(
                    session,
                    run_id=run_id,
                    correlation_id=run_id,
                    event_type="constraint_checked",
                    actor_type="agent",
                    actor_id="constraint_agent",
                    payload={
                        "supplier_id": sup_id,
                        "check_name": c.check_name,
                        "status": c.status,
                        "reason": c.reason,
                        "evidence": c.numeric_evidence,
                    },
                )

        await session.commit()
        return {"checks_by_supplier": checks_by_supplier}


@activity.defn
async def draft_activity(params: dict[str, Any]) -> dict[str, Any]:
    run_id = params["run_id"]
    correlation_id = params["correlation_id"]
    store_id = params["store_id"]
    signals_data = params["signals"]
    checks_data = params["checks_by_supplier"]

    factory = get_async_session_factory()
    async with factory() as session:
        agent = DraftAgent(session)
        routing_agent = RoutingAgent()

        by_supplier: dict[str, list[dict[str, Any]]] = {}
        for s in signals_data:
            sup_res = await session.execute(
                text("SELECT unit_cost, moq, lead_time_days FROM skus WHERE sku = :sku"),
                {"sku": s["sku"]},
            )
            sku_row = sup_res.mappings().first()
            moq = int(sku_row["moq"]) if sku_row else 10
            unit_cost = Decimal(str(sku_row["unit_cost"])) if sku_row else Decimal("100")
            lead_days = int(sku_row["lead_time_days"]) if sku_row else 5

            qty = calculate_order_qty(
                current_stock=s["current_stock"],
                sales_velocity_7d=s["sales_velocity_7d"],
                moq=moq,
            )
            line_val = qty * unit_cost

            sup_id = s["supplier_id"]
            if sup_id not in by_supplier:
                by_supplier[sup_id] = []

            by_supplier[sup_id].append({
                "sku": s["sku"],
                "sku_name": s["sku_name"],
                "qty": qty,
                "unit_cost": float(unit_cost),
                "line_value": float(line_val),
                "moq": moq,
                "lead_time_days": lead_days,
                "days_of_cover": s["days_of_cover"],
                "sales_velocity_7d": s["sales_velocity_7d"],
            })

        drafts: list[dict[str, Any]] = []

        for sup_id, lines in by_supplier.items():
            sup_res = await session.execute(
                text("SELECT name, approved FROM suppliers WHERE supplier_id = :id"),
                {"id": sup_id},
            )
            sup_row = sup_res.mappings().first()
            sup_name = sup_row["name"] if sup_row else sup_id
            sup_approved = bool(sup_row["approved"]) if sup_row else True

            raw_checks = [CheckResult(**c) for c in checks_data.get(sup_id, [])]
            total_val = sum(Decimal(str(l["line_value"])) for l in lines)

            route_info = routing_agent.route_draft(
                checks=raw_checks,
                total_value=total_val,
                supplier_approved=sup_approved,
            )

            draft_action = await agent.create_po_draft(
                run_id=run_id,
                store_id=store_id,
                supplier_id=sup_id,
                supplier_name=sup_name,
                lines=lines,
                checks=raw_checks,
                risk_class=route_info["risk_class"],
            )

            # Persist draft action to database
            action_uuid = uuid.UUID(draft_action.action_id)
            run_uuid = uuid.UUID(run_id)
            await session.execute(
                text("""
                    INSERT INTO draft_actions (
                        action_id, run_id, action_type, tool_name, tool_args,
                        risk_class, total_value, rationale, rationale_source,
                        evidence_refs, check_results, draft_status, created_at
                    ) VALUES (
                        :action_id, :run_id, :action_type, :tool_name, :tool_args::jsonb,
                        :risk_class, :total_value, :rationale, :rationale_source,
                        :evidence_refs::jsonb, :check_results::jsonb, :draft_status, NOW()
                    )
                    ON CONFLICT (action_id) DO NOTHING
                """),
                {
                    "action_id": action_uuid,
                    "run_id": run_uuid,
                    "action_type": draft_action.action_type,
                    "tool_name": draft_action.tool_name,
                    "tool_args": json.dumps(draft_action.tool_args),
                    "risk_class": draft_action.risk_class,
                    "total_value": float(draft_action.total_value),
                    "rationale": draft_action.rationale,
                    "rationale_source": draft_action.rationale_source,
                    "evidence_refs": json.dumps(draft_action.evidence_refs),
                    "check_results": json.dumps([c.model_dump(mode="json") for c in draft_action.check_results]),
                    "draft_status": "draft",
                },
            )

            # Audit event for action_drafted
            await write_audit_event(
                session,
                run_id=run_id,
                correlation_id=correlation_id,
                event_type="action_drafted",
                actor_type="agent",
                actor_id="draft_agent",
                payload={
                    "action_id": draft_action.action_id,
                    "action_type": draft_action.action_type,
                    "total_value": float(draft_action.total_value),
                    "risk_class": draft_action.risk_class,
                    "rationale_source": draft_action.rationale_source,
                },
            )

            drafts.append(draft_action.model_dump(mode="json"))

        await session.commit()
        return {"drafts": drafts}


@activity.defn
async def route_activity(params: dict[str, Any]) -> dict[str, Any]:
    drafts = params["drafts"]
    if not drafts:
        return {"tier": "auto", "risk_class": "low", "assigned_role": None}

    primary = drafts[0]
    routing_agent = RoutingAgent()

    factory = get_async_session_factory()
    async with factory() as session:
        sup_id = primary["tool_args"]["supplier_id"]
        sup_res = await session.execute(
            text("SELECT approved FROM suppliers WHERE supplier_id = :id"),
            {"id": sup_id},
        )
        sup_row = sup_res.mappings().first()
        sup_approved = bool(sup_row["approved"]) if sup_row else True

        checks = [CheckResult(**c) for c in primary["check_results"]]
        route_info = routing_agent.route_draft(
            checks=checks,
            total_value=Decimal(str(primary["total_value"])),
            supplier_approved=sup_approved,
        )
        return route_info


@activity.defn
async def create_approval_activity(params: dict[str, Any]) -> dict[str, Any]:
    run_id = params["run_id"]
    correlation_id = params["correlation_id"]
    drafts = params["drafts"]
    route = params["route"]

    approval_id = str(uuid.uuid4())
    primary_draft = drafts[0]
    action_id = primary_draft["action_id"]

    factory = get_async_session_factory()
    async with factory() as session:
        now = datetime.now(timezone.utc)

        # Update run status to awaiting_approval
        await session.execute(
            text("""
                UPDATE runs
                SET status = 'awaiting_approval', awaiting_since = :now,
                    agent_prep_ms = EXTRACT(MILLISECONDS FROM (:now - started_at))
                WHERE run_id = :run_id
            """),
            {"now": now, "run_id": uuid.UUID(run_id)},
        )

        # Insert approval request
        await session.execute(
            text("""
                INSERT INTO approval_requests (
                    approval_id, action_id, run_id, assigned_role, requested_at, status
                ) VALUES (
                    :approval_id, :action_id, :run_id, :assigned_role, :requested_at, 'pending'
                )
            """),
            {
                "approval_id": uuid.UUID(approval_id),
                "action_id": uuid.UUID(action_id),
                "run_id": uuid.UUID(run_id),
                "assigned_role": route["assigned_role"],
                "requested_at": now,
            },
        )

        # Record approval_requested audit event
        await write_audit_event(
            session,
            run_id=run_id,
            correlation_id=correlation_id,
            event_type="approval_requested",
            actor_type="system",
            actor_id="temporal_approval_gate",
            payload={
                "approval_id": approval_id,
                "action_id": action_id,
                "assigned_role": route["assigned_role"],
                "risk_class": route["risk_class"],
            },
        )

        await session.commit()

    return {"approval_id": approval_id}


@activity.defn
async def record_rejection_activity(params: dict[str, Any]) -> dict[str, Any]:
    run_id = params["run_id"]
    correlation_id = params["correlation_id"]
    decision = params["decision"]

    factory = get_async_session_factory()
    async with factory() as session:
        now = datetime.now(timezone.utc)

        await session.execute(
            text("""
                UPDATE runs
                SET status = 'rejected', completed_at = :now,
                    approval_wait_ms = EXTRACT(MILLISECONDS FROM (:now - awaiting_since))
                WHERE run_id = :run_id
            """),
            {"now": now, "run_id": uuid.UUID(run_id)},
        )

        await write_audit_event(
            session,
            run_id=run_id,
            correlation_id=correlation_id,
            event_type="action_rejected",
            actor_type="human",
            actor_id=decision["approver_id"],
            payload={
                "reason": decision.get("reason"),
                "outcome": "rejected",
            },
        )

        await write_audit_event(
            session,
            run_id=run_id,
            correlation_id=correlation_id,
            event_type="run_completed",
            actor_type="system",
            actor_id="temporal_workflow",
            payload={"outcome": "rejected"},
        )

        await session.commit()

    return {"status": "rejected"}


@activity.defn
async def execute_activity(params: dict[str, Any]) -> dict[str, Any]:
    run_id = params["run_id"]
    correlation_id = params["correlation_id"]
    drafts = params["drafts"]

    factory = get_async_session_factory()
    async with factory() as session:
        agent = ExecutionAgent(session)
        exec_results = []

        for d in drafts:
            draft_obj = DraftAction(**d)
            res = await agent.execute_draft(draft_obj)
            exec_results.append(res)

            # Record action_executed audit event
            await write_audit_event(
                session,
                run_id=run_id,
                correlation_id=correlation_id,
                event_type="action_executed",
                actor_type="agent",
                actor_id="execution_agent",
                payload={
                    "action_id": d["action_id"],
                    "po_id": res["po_id"],
                    "email_id": res["email_id"],
                    "to_email": res["to_email"],
                    "total_value": float(draft_obj.total_value),
                },
            )

        await session.commit()

    return {"results": exec_results}


@activity.defn
async def finalise_activity(params: dict[str, Any]) -> dict[str, Any]:
    run_id = params["run_id"]
    correlation_id = params.get("correlation_id", run_id)
    status = params.get("status", "completed")

    factory = get_async_session_factory()
    async with factory() as session:
        now = datetime.now(timezone.utc)

        await session.execute(
            text("""
                UPDATE runs
                SET status = :status, completed_at = :now,
                    approval_wait_ms = CASE
                        WHEN awaiting_since IS NOT NULL THEN EXTRACT(MILLISECONDS FROM (:now - awaiting_since))
                        ELSE approval_wait_ms
                    END
                WHERE run_id = :run_id
            """),
            {"status": status, "now": now, "run_id": uuid.UUID(run_id)},
        )

        await write_audit_event(
            session,
            run_id=run_id,
            correlation_id=correlation_id,
            event_type="run_completed",
            actor_type="system",
            actor_id="temporal_workflow",
            payload={"status": status},
        )

        await session.commit()

    return {"status": status}

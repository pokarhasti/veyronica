# =============================================================================
# Veyronica — LangGraph Workflow StateGraph
# Section 7: LangGraph State Machine for Replenishment.
# Note: Temporal owns the durable pause (workflow.wait_condition).
# LangGraph models the discrete agent execution transitions.
# =============================================================================
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from langgraph.graph import END, StateGraph
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.constraint_agent import ConstraintAgent
from app.agents.draft_agent import DraftAgent
from app.agents.execution_agent import ExecutionAgent
from app.agents.routing_agent import RoutingAgent
from app.agents.signal_agent import SignalAgent, calculate_order_qty
from app.graph.state import ReplenishmentState
from app.models.domain import CheckResult, DraftAction, ReplenishmentSignal

logger = logging.getLogger("veyronica.graph")


def create_replenishment_graph(session: AsyncSession) -> StateGraph:
    """
    Constructs the LangGraph StateGraph connecting:
    signal -> constraint -> draft -> route
    """
    workflow = StateGraph(ReplenishmentState)

    # 1. Signal Node
    async def signal_node(state: ReplenishmentState) -> dict[str, Any]:
        agent = SignalAgent(session)
        signals = await agent.detect_signals(state["store_id"], state["run_id"])
        return {"signals": signals, "status": "signals_detected"}

    # 2. Constraint Node
    async def constraint_node(state: ReplenishmentState) -> dict[str, Any]:
        agent = ConstraintAgent(session)
        signals = state.get("signals", [])

        # Group lines by supplier
        by_supplier: dict[str, list[dict[str, Any]]] = {}
        for s in signals:
            sup_res = await session.execute(
                text("SELECT unit_cost, moq, lead_time_days FROM skus WHERE sku = :sku"),
                {"sku": s.sku},
            )
            sku_row = sup_res.mappings().first()
            moq = int(sku_row["moq"]) if sku_row else 10
            unit_cost = Decimal(str(sku_row["unit_cost"])) if sku_row else Decimal("100")
            lead_days = int(sku_row["lead_time_days"]) if sku_row else 5

            qty = calculate_order_qty(
                current_stock=s.current_stock,
                sales_velocity_7d=s.sales_velocity_7d,
                moq=moq,
            )
            line_val = qty * unit_cost

            if s.supplier_id not in by_supplier:
                by_supplier[s.supplier_id] = []

            by_supplier[s.supplier_id].append({
                "sku": s.sku,
                "sku_name": s.sku_name,
                "qty": qty,
                "unit_cost": unit_cost,
                "line_value": line_val,
                "moq": moq,
                "lead_time_days": lead_days,
                "days_of_cover": s.days_of_cover,
                "sales_velocity_7d": s.sales_velocity_7d,
            })

        checks_by_supplier: dict[str, list[CheckResult]] = {}
        for sup_id, lines in by_supplier.items():
            po_val = sum(l["line_value"] for l in lines)
            checks = await agent.evaluate_supplier_order(
                store_id=state["store_id"],
                supplier_id=sup_id,
                lines=lines,
                po_value=po_val,
            )
            checks_by_supplier[sup_id] = checks

        return {
            "checks_by_supplier": checks_by_supplier,
            "status": "constraints_checked",
        }

    # 3. Draft Node
    async def draft_node(state: ReplenishmentState) -> dict[str, Any]:
        agent = DraftAgent(session)
        signals = state.get("signals", [])
        checks_by_supplier = state.get("checks_by_supplier", {})

        # Group lines again to build draft
        by_supplier: dict[str, list[dict[str, Any]]] = {}
        for s in signals:
            sup_res = await session.execute(
                text("SELECT unit_cost, moq, lead_time_days FROM skus WHERE sku = :sku"),
                {"sku": s.sku},
            )
            sku_row = sup_res.mappings().first()
            moq = int(sku_row["moq"]) if sku_row else 10
            unit_cost = Decimal(str(sku_row["unit_cost"])) if sku_row else Decimal("100")
            lead_days = int(sku_row["lead_time_days"]) if sku_row else 5

            qty = calculate_order_qty(
                current_stock=s.current_stock,
                sales_velocity_7d=s.sales_velocity_7d,
                moq=moq,
            )
            line_val = qty * unit_cost

            if s.supplier_id not in by_supplier:
                by_supplier[s.supplier_id] = []

            by_supplier[s.supplier_id].append({
                "sku": s.sku,
                "sku_name": s.sku_name,
                "qty": qty,
                "unit_cost": unit_cost,
                "line_value": line_val,
                "moq": moq,
                "lead_time_days": lead_days,
                "days_of_cover": s.days_of_cover,
                "sales_velocity_7d": s.sales_velocity_7d,
            })

        drafts: list[DraftAction] = []
        routing_agent = RoutingAgent()

        for sup_id, lines in by_supplier.items():
            checks = checks_by_supplier.get(sup_id, [])
            total_val = sum(l["line_value"] for l in lines)

            sup_res = await session.execute(
                text("SELECT name, approved FROM suppliers WHERE supplier_id = :id"),
                {"id": sup_id},
            )
            sup_row = sup_res.mappings().first()
            sup_name = sup_row["name"] if sup_row else sup_id
            sup_approved = bool(sup_row["approved"]) if sup_row else True

            route_info = routing_agent.route_draft(
                checks=checks,
                total_value=total_val,
                supplier_approved=sup_approved,
            )

            draft = await agent.create_po_draft(
                run_id=state["run_id"],
                store_id=state["store_id"],
                supplier_id=sup_id,
                supplier_name=sup_name,
                lines=lines,
                checks=checks,
                risk_class=route_info["risk_class"],
            )
            drafts.append(draft)

        return {"drafts": drafts, "status": "drafts_created"}

    # 4. Route Node
    async def route_node(state: ReplenishmentState) -> dict[str, Any]:
        drafts = state.get("drafts", [])
        if not drafts:
            return {"route": {"tier": "auto", "risk_class": "low", "assigned_role": None}}

        primary_draft = drafts[0]
        routing_agent = RoutingAgent()

        sup_id = primary_draft.tool_args.get("supplier_id", "")
        sup_res = await session.execute(
            text("SELECT approved FROM suppliers WHERE supplier_id = :id"),
            {"id": sup_id},
        )
        sup_row = sup_res.mappings().first()
        sup_approved = bool(sup_row["approved"]) if sup_row else True

        route_info = routing_agent.route_draft(
            checks=primary_draft.check_results,
            total_value=primary_draft.total_value,
            supplier_approved=sup_approved,
        )

        return {"route": route_info, "status": "routed"}

    # Register nodes and flow
    workflow.add_node("signal", signal_node)
    workflow.add_node("constraint", constraint_node)
    workflow.add_node("draft", draft_node)
    workflow.add_node("route", route_node)

    workflow.set_entry_point("signal")
    workflow.add_edge("signal", "constraint")
    workflow.add_edge("constraint", "draft")
    workflow.add_edge("draft", "route")
    workflow.add_edge("route", END)

    return workflow

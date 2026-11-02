# =============================================================================
# Veyronica — Agent Unit Tests
# Tests order quantity calculation, pack sizing, and agent initialization.
# =============================================================================
from decimal import Decimal
import pytest

from app.agents.signal_agent import calculate_order_qty
from app.agents.routing_agent import RoutingAgent
from app.models.domain import CheckResult


def test_calculate_order_qty_hero_scenario():
    # Hero scenario line: SKU-8821
    # current_stock = 24, velocity = 6 units/day, target_cover = 14 days, moq = 50, pack = 10
    # needed = 14 * 6 - 24 = 60. Pack size multiple = 60. Max(50, 60) = 60.
    qty = calculate_order_qty(
        current_stock=24,
        sales_velocity_7d=6.0,
        moq=50,
        target_cover_days=14,
        pack_size=10,
    )
    assert qty == 60


def test_calculate_order_qty_moq_bound():
    # SKU-7732: current_stock = 12, velocity = 3 units/day, target_cover = 14
    # needed = 14 * 3 - 12 = 30. Pack multiple = 30. MOQ = 40. Max(40, 30) = 40.
    qty = calculate_order_qty(
        current_stock=12,
        sales_velocity_7d=3.0,
        moq=40,
        target_cover_days=14,
        pack_size=10,
    )
    assert qty == 40


def test_calculate_order_qty_pack_size_round_up():
    # needed = 14 * 2.5 - 12 = 23 -> rounds up to 30. MOQ = 20. Max(20, 30) = 30.
    qty = calculate_order_qty(
        current_stock=12,
        sales_velocity_7d=2.5,
        moq=20,
        target_cover_days=14,
        pack_size=10,
    )
    assert qty == 30


def test_routing_agent_hero_scenario():
    agent = RoutingAgent()
    checks = [
        CheckResult(check_name="moq", status="PASS", reason="ok", numeric_evidence={}),
        CheckResult(check_name="lead_time", status="PASS", reason="ok", numeric_evidence={}),
        CheckResult(check_name="budget_headroom", status="FLAG", reason="70%", numeric_evidence={}),
        CheckResult(check_name="credit_limit", status="PASS", reason="ok", numeric_evidence={}),
    ]
    res = agent.route_draft(checks, Decimal("42000"), True)
    assert res["tier"] == "store_manager"
    assert res["risk_class"] == "medium"
    assert res["assigned_role"] == "store_manager"


def test_check_results_json_array_serialization():
    import json
    from app.models.domain import CheckResult

    checks = [
        CheckResult(check_name="moq", status="PASS", reason="ok", numeric_evidence={"moq": 10}),
        CheckResult(check_name="lead_time", status="PASS", reason="ok", numeric_evidence={"days": 5}),
    ]

    # Verify serialization is a direct JSON list, not a wrapped dictionary
    serialized = json.dumps([c.model_dump(mode="json") for c in checks])
    parsed = json.loads(serialized)
    assert isinstance(parsed, list)
    assert len(parsed) == 2
    assert parsed[0]["check_name"] == "moq"


def test_multi_supplier_route_aggregation():
    agent = RoutingAgent()
    tier_order = {"auto": 0, "store_manager": 1, "regional_manager": 2}
    risk_order = {"low": 0, "medium": 1, "high": 2}

    # Draft 1: Low risk, auto-approved (<= 10000)
    checks1 = [
        CheckResult(check_name="moq", status="PASS", reason="ok", numeric_evidence={}),
        CheckResult(check_name="budget_headroom", status="PASS", reason="ok", numeric_evidence={}),
    ]
    route1 = agent.route_draft(checks1, Decimal("8000"), True)
    assert route1["tier"] == "auto"

    # Draft 2: High value, regional manager required
    checks2 = [
        CheckResult(check_name="moq", status="PASS", reason="ok", numeric_evidence={}),
        CheckResult(check_name="budget_headroom", status="FLAG", reason="70%", numeric_evidence={}),
    ]
    route2 = agent.route_draft(checks2, Decimal("150000"), True)
    assert route2["tier"] == "regional_manager"

    # Aggregated run level
    highest_tier = "auto"
    highest_risk = "low"
    for r in [route1, route2]:
        if tier_order[r["tier"]] > tier_order[highest_tier]:
            highest_tier = r["tier"]
        if risk_order[r["risk_class"]] > risk_order[highest_risk]:
            highest_risk = r["risk_class"]

    assert highest_tier == "regional_manager"
    assert highest_risk == "high"



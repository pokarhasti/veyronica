# =============================================================================
# Veyronica — Deterministic Checks Unit Tests
# Tests Section 4.2 constraint rules: MOQ, lead time, budget, credit.
# =============================================================================
from decimal import Decimal
import pytest

from app.checks.moq import check_moq
from app.checks.lead_time import check_lead_time
from app.checks.budget import check_budget_headroom
from app.checks.credit import check_credit_limit


def test_moq_check_pass():
    lines = [
        {"sku": "SKU-8821", "qty": 60, "moq": 50},
        {"sku": "SKU-7732", "qty": 40, "moq": 40},
    ]
    res = check_moq(lines)
    assert res.status == "PASS"
    assert res.numeric_evidence["line_count"] == 2
    assert all(l["passed"] for l in res.numeric_evidence["lines"])


def test_moq_check_fail():
    lines = [
        {"sku": "SKU-8821", "qty": 30, "moq": 50},
    ]
    res = check_moq(lines)
    assert res.status == "FAIL"
    assert "MOQ 50" in res.reason


def test_lead_time_pass():
    lines = [
        {"sku": "SKU-8821", "lead_time_days": 5, "days_of_cover": 4.0},
        {"sku": "SKU-7732", "lead_time_days": 6, "days_of_cover": 4.0},
    ]
    res = check_lead_time(lines)
    assert res.status == "PASS"
    assert res.numeric_evidence["max_lead_time_days"] == 6


def test_lead_time_flag():
    lines = [
        {"sku": "SKU-3402", "lead_time_days": 9, "days_of_cover": 3.0},
    ]
    res = check_lead_time(lines)
    assert res.status == "FLAG"
    assert res.numeric_evidence["max_lead_time_days"] == 9
    assert res.numeric_evidence["lines"][0]["stockout_gap_days"] == 6.0


def test_lead_time_fail():
    lines = [
        {"sku": "SKU-9999", "lead_time_days": 14, "days_of_cover": 2.0},
    ]
    res = check_lead_time(lines)
    assert res.status == "FAIL"


def test_budget_headroom_pass():
    # PO 20k on remaining 60k (33.3%) -> PASS
    res = check_budget_headroom(
        po_value=Decimal("20000"),
        monthly_budget=Decimal("150000"),
        budget_spent=Decimal("90000"),
    )
    assert res.status == "PASS"
    assert res.numeric_evidence["pct_of_headroom"] == 33.3


def test_budget_headroom_flag_hero_scenario():
    # STORE-214 Hero Scenario: PO 42k on remaining 60k (70.0%) -> FLAG
    res = check_budget_headroom(
        po_value=Decimal("42000"),
        monthly_budget=Decimal("150000"),
        budget_spent=Decimal("90000"),
    )
    assert res.status == "FLAG"
    assert res.numeric_evidence["pct_of_headroom"] == 70.0


def test_budget_headroom_fail():
    # PO 70k on remaining 60k -> FAIL
    res = check_budget_headroom(
        po_value=Decimal("70000"),
        monthly_budget=Decimal("150000"),
        budget_spent=Decimal("90000"),
    )
    assert res.status == "FAIL"


def test_credit_limit_pass():
    # PO 42k on remaining 120k (35.0%) -> PASS
    res = check_credit_limit(
        po_value=Decimal("42000"),
        credit_limit=Decimal("300000"),
        credit_outstanding=Decimal("180000"),
    )
    assert res.status == "PASS"
    assert res.numeric_evidence["pct_of_credit"] == 35.0


def test_credit_limit_flag():
    # PO 80k on remaining 100k (80.0%) -> FLAG
    res = check_credit_limit(
        po_value=Decimal("80000"),
        credit_limit=Decimal("200000"),
        credit_outstanding=Decimal("100000"),
    )
    assert res.status == "FLAG"


def test_credit_limit_fail():
    # PO 120k on remaining 100k -> FAIL
    res = check_credit_limit(
        po_value=Decimal("120000"),
        credit_limit=Decimal("200000"),
        credit_outstanding=Decimal("100000"),
    )
    assert res.status == "FAIL"

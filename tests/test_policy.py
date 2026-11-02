# =============================================================================
# Veyronica — Approval Routing Policy Table-Driven Tests
# Tests Section 4.3 & 4.4: Priority rules for Risk Classification & Approval Tier
# =============================================================================
from decimal import Decimal
import pytest

from app.models.domain import CheckResult
from app.policy.routing import classify_risk, evaluate_approval_policy

AUTO_LIMIT = Decimal("10000")
STORE_MANAGER_LIMIT = Decimal("50000")


def _make_check(name: str, status: str) -> CheckResult:
    return CheckResult(
        check_name=name,
        status=status,
        reason=f"Test {name} is {status}",
        numeric_evidence={},
    )


class TestRiskClassification:
    def test_any_fail_produces_high_risk(self):
        checks = [_make_check("moq", "FAIL"), _make_check("lead_time", "PASS")]
        risk = classify_risk(checks, Decimal("5000"), True, STORE_MANAGER_LIMIT)
        assert risk == "high"

    def test_unapproved_supplier_produces_high_risk(self):
        checks = [_make_check("moq", "PASS"), _make_check("lead_time", "PASS")]
        risk = classify_risk(checks, Decimal("5000"), False, STORE_MANAGER_LIMIT)
        assert risk == "high"

    def test_value_exceeding_double_limit_produces_high_risk(self):
        # 2 * 50k = 100k
        checks = [_make_check("moq", "PASS")]
        risk = classify_risk(checks, Decimal("105000"), True, STORE_MANAGER_LIMIT)
        assert risk == "high"

    def test_flag_produces_medium_risk(self):
        # Hero Scenario: budget headroom is FLAG (70%)
        checks = [_make_check("moq", "PASS"), _make_check("budget_headroom", "FLAG")]
        risk = classify_risk(checks, Decimal("42000"), True, STORE_MANAGER_LIMIT)
        assert risk == "medium"

    def test_all_pass_produces_low_risk(self):
        checks = [_make_check("moq", "PASS"), _make_check("lead_time", "PASS")]
        risk = classify_risk(checks, Decimal("8000"), True, STORE_MANAGER_LIMIT)
        assert risk == "low"


class TestApprovalRoutingPolicy:
    @pytest.mark.parametrize(
        "checks,total_value,supplier_approved,risk_class,expected_tier",
        [
            # Rule 1: Any check is FAIL -> Regional Procurement Manager
            (
                [_make_check("moq", "FAIL")],
                Decimal("5000"),
                True,
                "high",
                "regional_manager",
            ),
            # Rule 2: risk_class = high -> Regional Procurement Manager
            (
                [_make_check("moq", "PASS")],
                Decimal("120000"),
                True,
                "high",
                "regional_manager",
            ),
            # Rule 3: total_value > STORE_MANAGER_LIMIT (₹50k) -> Regional Procurement Manager
            (
                [_make_check("moq", "PASS")],
                Decimal("65000"),
                True,
                "medium",
                "regional_manager",
            ),
            # Rule 4: STORE-214 Hero Scenario: total_value ₹42,000 -> Store Manager
            (
                [_make_check("budget_headroom", "FLAG")],
                Decimal("42000"),
                True,
                "medium",
                "store_manager",
            ),
            # Rule 5: Unapproved supplier with small PO -> Store Manager (rule 5)
            # note: classify_risk returns high, but if passed directly:
            (
                [_make_check("moq", "PASS")],
                Decimal("6000"),
                False,
                "low",
                "store_manager",
            ),
            # Rule 6: STORE-087 Scenario: Small order <= ₹10k, approved supplier -> Auto
            (
                [_make_check("moq", "PASS"), _make_check("budget_headroom", "PASS")],
                Decimal("7500"),
                True,
                "low",
                "auto",
            ),
        ],
    )
    def test_routing_table_scenarios(
        self, checks, total_value, supplier_approved, risk_class, expected_tier
    ):
        tier = evaluate_approval_policy(
            checks=checks,
            total_value=total_value,
            supplier_approved=supplier_approved,
            risk_class=risk_class,
            auto_limit=AUTO_LIMIT,
            store_manager_limit=STORE_MANAGER_LIMIT,
        )
        assert tier == expected_tier

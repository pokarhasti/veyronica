# =============================================================================
# Veyronica — Routing Agent
# Section 4.3: Evaluates approval tier and assigns responsible role.
# =============================================================================
from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.config import get_settings
from app.models.domain import CheckResult
from app.policy.routing import ApprovalTier, RiskClass, classify_risk, evaluate_approval_policy


class RoutingAgent:
    """Evaluates approval policies and determines workflow routing tier."""

    def __init__(self):
        self.settings = get_settings()

    def route_draft(
        self,
        checks: list[CheckResult],
        total_value: Decimal,
        supplier_approved: bool,
    ) -> dict[str, Any]:
        """
        Determine risk classification and approval tier.
        Returns: {"tier": str, "risk_class": str, "assigned_role": str | None}
        """
        risk_class = classify_risk(
            checks=checks,
            total_value=total_value,
            supplier_approved=supplier_approved,
            store_manager_limit=self.settings.store_manager_limit,
        )

        tier = evaluate_approval_policy(
            checks=checks,
            total_value=total_value,
            supplier_approved=supplier_approved,
            risk_class=risk_class,
            auto_limit=self.settings.auto_approve_limit,
            store_manager_limit=self.settings.store_manager_limit,
        )

        assigned_role = None
        if tier == "store_manager":
            assigned_role = "store_manager"
        elif tier == "regional_manager":
            assigned_role = "regional_manager"

        return {
            "tier": tier,
            "risk_class": risk_class,
            "assigned_role": assigned_role,
        }

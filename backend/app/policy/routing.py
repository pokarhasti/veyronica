# =============================================================================
# Veyronica — Approval Routing Policy (Single Source of Truth)
# Section 4.3 & 4.4: Priority rules for Risk Classification & Approval Tier
# Evaluated strictly top to bottom; the first matching rule wins.
# =============================================================================
from __future__ import annotations

from decimal import Decimal
from typing import Literal

from app.models.domain import CheckResult

ApprovalTier = Literal["auto", "store_manager", "regional_manager"]
RiskClass = Literal["low", "medium", "high"]


def classify_risk(
    checks: list[CheckResult],
    total_value: Decimal | float,
    supplier_approved: bool,
    store_manager_limit: Decimal | float,
) -> RiskClass:
    """
    Classify risk level deterministically:
    - high: any FAIL, OR supplier unapproved, OR total_value > 2 * store_manager_limit
    - medium: at least one FLAG
    - low: all PASS
    """
    val = Decimal(str(total_value))
    sm_lim = Decimal(str(store_manager_limit))

    if any(c.status == "FAIL" for c in checks):
        return "high"
    if not supplier_approved:
        return "high"
    if val > 2 * sm_lim:
        return "high"
    if any(c.status == "FLAG" for c in checks):
        return "medium"
    return "low"


def evaluate_approval_policy(
    checks: list[CheckResult],
    total_value: Decimal | float,
    supplier_approved: bool,
    risk_class: RiskClass,
    auto_limit: Decimal | float,
    store_manager_limit: Decimal | float,
) -> ApprovalTier:
    """
    Evaluated top to bottom; the first matching rule wins:
    1. Any check is FAIL -> Regional Procurement Manager
    2. risk_class == 'high' -> Regional Procurement Manager
    3. total_value > STORE_MANAGER_LIMIT (₹50,000) -> Regional Procurement Manager
    4. total_value > AUTO_APPROVE_LIMIT (₹10,000) -> Store Manager
    5. Supplier NOT approved -> Store Manager
    6. Otherwise (<= ₹10,000, approved supplier, no FAIL) -> Auto-approve
    """
    val = Decimal(str(total_value))
    sm_lim = Decimal(str(store_manager_limit))
    auto_lim = Decimal(str(auto_limit))

    if any(c.status == "FAIL" for c in checks):
        return "regional_manager"
    if risk_class == "high":
        return "regional_manager"
    if val > sm_lim:
        return "regional_manager"
    if val > auto_lim:
        return "store_manager"
    if not supplier_approved:
        return "store_manager"
    return "auto"

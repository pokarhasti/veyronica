# =============================================================================
# Veyronica — Budget Headroom Check (Deterministic)
# Section 4.2: Store Monthly Budget Headroom Check
# PASS: PO value <= 50% of remaining monthly budget
# FLAG: 50% - 100% of remaining monthly budget
# FAIL: PO value > remaining monthly budget
# =============================================================================
from __future__ import annotations

from decimal import Decimal
from app.models.domain import CheckResult


def check_budget_headroom(
    po_value: Decimal | float,
    monthly_budget: Decimal | float,
    budget_spent: Decimal | float,
) -> CheckResult:
    po_val = Decimal(str(po_value))
    m_budget = Decimal(str(monthly_budget))
    b_spent = Decimal(str(budget_spent))
    remaining = max(Decimal("0"), m_budget - b_spent)

    if remaining <= 0:
        pct = Decimal("100.0") if po_val > 0 else Decimal("0.0")
    else:
        pct = round((po_val / remaining) * Decimal("100"), 1)

    evidence = {
        "po_value": float(po_val),
        "monthly_budget": float(m_budget),
        "budget_spent": float(b_spent),
        "budget_remaining": float(remaining),
        "pct_of_headroom": float(pct),
    }

    if po_val > remaining:
        return CheckResult(
            check_name="budget_headroom",
            status="FAIL",
            reason=f"PO value ₹{po_val:,.2f} exceeds remaining budget ₹{remaining:,.2f}",
            numeric_evidence=evidence,
        )
    elif pct > Decimal("50.0"):
        return CheckResult(
            check_name="budget_headroom",
            status="FLAG",
            reason=f"PO value ₹{po_val:,.2f} utilizes {pct}% of remaining budget headroom (₹{remaining:,.2f})",
            numeric_evidence=evidence,
        )

    return CheckResult(
        check_name="budget_headroom",
        status="PASS",
        reason=f"PO value ₹{po_val:,.2f} is within 50% of remaining headroom (utilizes {pct}%)",
        numeric_evidence=evidence,
    )

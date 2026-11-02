# =============================================================================
# Veyronica — Credit Limit Check (Deterministic)
# Section 4.2: Supplier Credit Limit Check
# PASS: PO value <= 50% of supplier's remaining credit headroom
# FLAG: 50% - 100% of supplier's remaining credit headroom
# FAIL: PO value > supplier's remaining credit headroom
# =============================================================================
from __future__ import annotations

from decimal import Decimal
from app.models.domain import CheckResult


def check_credit_limit(
    po_value: Decimal | float,
    credit_limit: Decimal | float,
    credit_outstanding: Decimal | float,
) -> CheckResult:
    po_val = Decimal(str(po_value))
    c_limit = Decimal(str(credit_limit))
    c_outstanding = Decimal(str(credit_outstanding))
    remaining = max(Decimal("0"), c_limit - c_outstanding)

    if remaining <= 0:
        pct = Decimal("100.0") if po_val > 0 else Decimal("0.0")
    else:
        pct = round((po_val / remaining) * Decimal("100"), 1)

    evidence = {
        "po_value": float(po_val),
        "credit_limit": float(c_limit),
        "credit_outstanding": float(c_outstanding),
        "credit_remaining": float(remaining),
        "pct_of_credit": float(pct),
    }

    if po_val > remaining:
        return CheckResult(
            check_name="credit_limit",
            status="FAIL",
            reason=f"PO value ₹{po_val:,.2f} exceeds supplier remaining credit limit ₹{remaining:,.2f}",
            numeric_evidence=evidence,
        )
    elif pct > Decimal("50.0"):
        return CheckResult(
            check_name="credit_limit",
            status="FLAG",
            reason=f"PO value ₹{po_val:,.2f} consumes {pct}% of supplier remaining credit headroom (₹{remaining:,.2f})",
            numeric_evidence=evidence,
        )

    return CheckResult(
        check_name="credit_limit",
        status="PASS",
        reason=f"PO value ₹{po_val:,.2f} is well within available credit limit (consumes {pct}%)",
        numeric_evidence=evidence,
    )

# =============================================================================
# Veyronica — Lead Time Check (Deterministic)
# Section 4.2: Supplier Delivery Lead Time Check
# PASS: max line lead time <= 7 days
# FLAG: 8–10 days
# FAIL: > 10 days
# Includes stockout_gap_days = max(0, lead_time - days_of_cover) for information.
# =============================================================================
from __future__ import annotations

from typing import Any
from app.models.domain import CheckResult


def check_lead_time(lines: list[dict[str, Any]]) -> CheckResult:
    """
    Evaluate lead time constraint across lines.
    lines is expected to contain:
      'sku': str, 'lead_time_days': int, 'days_of_cover': float (optional, default 0.0)
    """
    max_lead_time = 0
    line_details = []

    for line in lines:
        sku = line.get("sku", "")
        lt = int(line.get("lead_time_days", 0))
        cover = float(line.get("days_of_cover", 0.0))
        stockout_gap = max(0.0, round(lt - cover, 2))

        if lt > max_lead_time:
            max_lead_time = lt

        line_details.append({
            "sku": sku,
            "lead_time_days": lt,
            "days_of_cover": cover,
            "stockout_gap_days": stockout_gap,
        })

    evidence = {
        "max_lead_time_days": max_lead_time,
        "pass_threshold_days": 7,
        "flag_upper_threshold_days": 10,
        "lines": line_details,
    }

    if max_lead_time > 10:
        return CheckResult(
            check_name="lead_time",
            status="FAIL",
            reason=f"Lead time {max_lead_time} days exceeds 10-day maximum limit",
            numeric_evidence=evidence,
        )
    elif max_lead_time > 7:
        return CheckResult(
            check_name="lead_time",
            status="FLAG",
            reason=f"Lead time {max_lead_time} days is between 8 and 10 days (moderate delay risk)",
            numeric_evidence=evidence,
        )

    return CheckResult(
        check_name="lead_time",
        status="PASS",
        reason=f"Max lead time {max_lead_time} days is within 7-day standard threshold",
        numeric_evidence=evidence,
    )

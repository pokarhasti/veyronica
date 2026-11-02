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
    max_stockout_gap = 0.0
    total_lost_revenue = 0.0
    line_details = []

    for line in lines:
        sku = line.get("sku", "")
        lt = int(line.get("lead_time_days", 0))
        cover = float(line.get("days_of_cover", 0.0))
        velocity = float(line.get("sales_velocity_7d", 0.0))
        unit_cost = float(line.get("unit_cost", 0.0))

        stockout_gap = max(0.0, round(lt - cover, 2))
        lost_rev = round(stockout_gap * velocity * unit_cost * 1.4, 2)

        if lt > max_lead_time:
            max_lead_time = lt
        if stockout_gap > max_stockout_gap:
            max_stockout_gap = stockout_gap
        total_lost_revenue += lost_rev

        line_details.append({
            "sku": sku,
            "lead_time_days": lt,
            "days_of_cover": cover,
            "stockout_gap_days": stockout_gap,
            "estimated_lost_revenue_inr": lost_rev,
        })

    evidence = {
        "max_lead_time_days": max_lead_time,
        "max_stockout_gap_days": max_stockout_gap,
        "total_lost_revenue_at_risk_inr": round(total_lost_revenue, 2),
        "pass_threshold_days": 7,
        "flag_upper_threshold_days": 10,
        "lines": line_details,
    }

    gap_note = f" (Stockout gap: {max_stockout_gap}d unserved demand, est. ₹{int(total_lost_revenue):,} lost sales at risk)" if max_stockout_gap > 0 else ""

    if max_lead_time > 10:
        return CheckResult(
            check_name="lead_time",
            status="FAIL",
            reason=f"Lead time {max_lead_time} days exceeds 10-day maximum limit{gap_note}",
            numeric_evidence=evidence,
        )
    elif max_lead_time > 7:
        return CheckResult(
            check_name="lead_time",
            status="FLAG",
            reason=f"Lead time {max_lead_time} days is between 8 and 10 days (moderate delay risk){gap_note}",
            numeric_evidence=evidence,
        )

    return CheckResult(
        check_name="lead_time",
        status="PASS",
        reason=f"Max lead time {max_lead_time} days is within 7-day standard threshold{gap_note}",
        numeric_evidence=evidence,
    )

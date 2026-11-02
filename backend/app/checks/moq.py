# =============================================================================
# Veyronica — MOQ Check (Deterministic)
# Section 4.2: Minimum Order Quantity Check
# PASS: every line qty >= MOQ
# FAIL: any line qty < MOQ
# =============================================================================
from __future__ import annotations

from typing import Any
from app.models.domain import CheckResult


def check_moq(lines: list[dict[str, Any]]) -> CheckResult:
    """
    Evaluate MOQ constraint across all lines.
    lines is expected to be a list of dicts with:
      'sku': str, 'qty': int, 'moq': int
    """
    failures = []
    evidence_lines = []

    for line in lines:
        sku = line.get("sku", "")
        qty = int(line.get("qty", 0))
        moq = int(line.get("moq", 0))
        passed = qty >= moq
        evidence_lines.append({
            "sku": sku,
            "qty": qty,
            "moq": moq,
            "passed": passed,
        })
        if not passed:
            failures.append(f"{sku}: {qty} < MOQ {moq}")

    evidence = {
        "line_count": len(lines),
        "lines": evidence_lines,
    }

    if failures:
        return CheckResult(
            check_name="moq",
            status="FAIL",
            reason=f"MOQ check failed for {len(failures)} line(s): {', '.join(failures)}",
            numeric_evidence=evidence,
        )

    return CheckResult(
        check_name="moq",
        status="PASS",
        reason=f"All {len(lines)} line(s) meet or exceed MOQ requirements",
        numeric_evidence=evidence,
    )

# =============================================================================
# Veyronica — LangGraph State Definition
# Section 7.1: ReplenishmentState TypedDict for agent state machine.
# =============================================================================
from __future__ import annotations

from typing import Any, TypedDict

from app.models.domain import ApprovalRequest, CheckResult, DraftAction, ReplenishmentSignal


class ReplenishmentState(TypedDict):
    run_id: str
    correlation_id: str
    store_id: str
    signals: list[ReplenishmentSignal]
    checks_by_supplier: dict[str, list[CheckResult]]
    drafts: list[DraftAction]
    route: dict[str, Any]  # {tier, risk_class, assigned_role}
    approval: ApprovalRequest | None
    execution_result: dict[str, Any] | None
    status: str

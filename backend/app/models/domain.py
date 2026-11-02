# =============================================================================
# Veyronica — Pydantic v2 Domain Schemas
# These are the API / internal data models from Section 5 of PROJECT.md.
# Used for request/response serialisation, agent state, and validation.
# =============================================================================
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Section 5.1 — Replenishment Signal
# ─────────────────────────────────────────────────────────────────────────────

class ReplenishmentSignal(BaseModel):
    signal_id: str
    run_id: str
    sku: str
    sku_name: str
    store_id: str
    current_stock: int
    reorder_threshold: int
    sales_velocity_7d: float
    days_of_cover: float
    supplier_id: str
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Section 5.2 — Check Result
# ─────────────────────────────────────────────────────────────────────────────

class CheckResult(BaseModel):
    check_name: Literal[
        "moq", "lead_time", "budget_headroom", "credit_limit", "dc_allocation", "peer_transfer"
    ]
    status: Literal["PASS", "FLAG", "FAIL"]
    reason: str
    numeric_evidence: dict


# ─────────────────────────────────────────────────────────────────────────────
# Section 5.3 — Draft Action
# ─────────────────────────────────────────────────────────────────────────────

class DraftLine(BaseModel):
    sku: str
    sku_name: str
    qty: int
    unit_cost: Decimal
    line_value: Decimal


class DraftAction(BaseModel):
    action_id: str
    run_id: str
    action_type: Literal["create_purchase_order", "send_supplier_email"]
    tool_name: str
    tool_args: dict  # includes supplier_id, store_id, lines: list[DraftLine]
    risk_class: Literal["low", "medium", "high"]
    total_value: Decimal
    rationale: str  # LLM-written or template fallback
    rationale_source: Literal["ai_generated", "template"] = "template"
    evidence_refs: list[str]
    check_results: list[CheckResult]
    draft_status: Literal[
        "draft", "pending_approval", "approved", "rejected", "executed", "failed"
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Section 5.4 — Approval Request
# ─────────────────────────────────────────────────────────────────────────────

class ApprovalRequest(BaseModel):
    approval_id: str
    action_id: str
    run_id: str
    assigned_role: Literal["store_manager", "regional_manager"]
    requested_at: datetime
    status: Literal["pending", "approved", "rejected"]
    decided_by: str | None = None
    decided_by_role: str | None = None
    decided_at: datetime | None = None
    rejection_reason: str | None = None  # mandatory on reject, min 20 chars


# ─────────────────────────────────────────────────────────────────────────────
# Section 5.5 — Decision Request (API input)
# ─────────────────────────────────────────────────────────────────────────────

class DecisionRequest(BaseModel):
    approver_id: str
    reason: str | None = None  # required (>= 20 chars) when rejecting
    line_overrides: list[dict[str, Any]] | None = None  # Innovation 3.4: interactive line item adjustments


class PolicySuggestion(BaseModel):
    suggestion_id: str
    run_id: str
    approval_id: str
    rejected_by: str
    rejection_reason: str
    current_rule: str
    suggested_rule: str
    rationale: str
    confidence: float = 0.85
    status: Literal["suggested", "applied", "dismissed"] = "suggested"
    created_at: datetime


class SimulateStoreStateRequest(BaseModel):
    store_id: str
    budget_spent: float | None = None
    monthly_budget: float | None = None
    sku: str | None = None
    current_stock: int | None = None
    sales_velocity_7d: float | None = None
    approver_id: str | None = None
    approver_active: bool | None = None


# ─────────────────────────────────────────────────────────────────────────────
# API Request / Response Models
# ─────────────────────────────────────────────────────────────────────────────

class TriggerRequest(BaseModel):
    store_id: str


class TriggerResponse(BaseModel):
    run_id: str
    correlation_id: str
    temporal_wf_id: str
    status: str


class RunSummary(BaseModel):
    run_id: str
    correlation_id: str
    store_id: str
    status: str
    started_at: datetime
    awaiting_since: datetime | None = None
    completed_at: datetime | None = None
    agent_prep_ms: int | None = None
    approval_wait_ms: int | None = None


class RunDetail(RunSummary):
    signals: list[ReplenishmentSignal] = []
    drafts: list[DraftAction] = []
    approval_requests: list[ApprovalRequest] = []
    audit_events: list[AuditEvent] = []


class AuditEvent(BaseModel):
    event_id: int
    run_id: str
    correlation_id: str
    event_type: str
    actor_type: str  # agent | human | system
    actor_id: str
    payload: dict
    created_at: datetime


class DashboardMetrics(BaseModel):
    total_runs: int = 0
    pending_approvals: int = 0
    approved: int = 0
    rejected: int = 0
    auto_approved: int = 0
    avg_agent_prep_seconds: float | None = None
    avg_approval_wait_seconds: float | None = None
    manual_baseline_minutes: dict = Field(
        default_factory=lambda: {"low": 6, "high": 10}
    )
    digiproc_baseline_minutes: int = 1


class ApproverInfo(BaseModel):
    approver_id: str
    name: str
    role: str
    store_id: str | None = None


class HealthStatus(BaseModel):
    postgres: str  # ok | error
    temporal: str  # ok | unreachable
    worker: str  # ok | offline
    inventory_adapter: str  # ok | error
    erp_adapter: str  # ok | error
    supplier_adapter: str  # ok | error


# Fix forward reference in RunDetail
RunDetail.model_rebuild()

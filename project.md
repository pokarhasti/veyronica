# PROJECT.md — Veyronica

### V-Mart Governed Agentic Replenishment Platform

> **Project name:** **Veyronica**
> **Hackathon track:** Agentic AI for Autonomous Business Process Automation
> **Stack tags:** Software + AI/ML + Cloud Computing + Data Analytics
> **Build window:** 30 hours
> **One-line pitch:** Veyronica is a governed agentic execution layer for V-Mart's store replenishment workflow. Agents read inventory and ERP data, deterministic checks flag risks, a named human approves purchase orders above policy limits, and every action, decision, and outcome is recorded in an append-only audit trail.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement-sourced-specific-measurable)
2. [Solution Architecture](#2-solution-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Business Rules (Single Source of Truth)](#4-business-rules-single-source-of-truth)
5. [Data Models](#5-data-models)
6. [Database Schema](#6-database-schema)
7. [LangGraph State and Temporal Workflow](#7-langgraph-state-and-temporal-workflow)
8. [API Endpoints](#8-api-endpoints)
9. [UI Screens](#9-ui-screens)
10. [Adapter Layer and Seed Data](#10-adapter-layer-simulated-clearly-labelled)
11. [Differentiators](#11-differentiators-pick-exactly-two)
12. [Explicit Non-Goals](#12-what-to-explicitly-skip)
13. [Repository Structure](#13-repository-structure)
14. [Local Setup and Environment](#14-local-setup-and-environment-variables)
15. [30-Hour Build Plan](#15-30-hour-build-plan)
16. [Testing Plan](#16-testing-plan)
17. [Risks and Fallbacks](#17-risks-and-fallbacks)
18. [60-Second Demo Script](#18-the-60-second-demo-script)
19. [SIH 2026 Rubric Mapping](#19-sih-2026-rubric-mapping)
20. [AI Coding Agent Instructions (Paste Into IDE)](#20-ai-coding-agent-instructions-paste-into-the-ide)
21. [Definition of Done](#21-definition-of-done)
22. [Future Extensibility (Slide Only)](#22-future-extensibility-slide-only--do-not-build)

---

## 1. Problem Statement (Sourced, Specific, Measurable)

V-Mart Retail operates **497 stores across 27 states** (FY25), serving Tier-II, Tier-III, and Tier-IV India with a value-fashion model. The company runs **Ginesys** as its core retail ERP for sourcing, vendor payments, supply chain, and POS, and it adopted **Supplymint's DigiProc** for digital procurement.

That adoption produced a documented baseline: **manual purchase-order creation took 6–10 minutes per document; DigiProc reduced it to about 1 minute**. Despite this improvement, V-Mart's procurement workflow still spans **identifying needs, purchase requisitions, budget approvals, quotation requests, negotiation, legal contracts, delivery follow-up, three-way matching, invoice approval, and record-keeping**. It is a multi-step, multi-system sequence with multiple approval points and no unified execution record.

V-Mart's CFO has publicly stated the company is **replacing legacy RPA with agentic AI** because agentic systems "learn and adjust automatically when variables change," targeting **50% of finance functions** covered by agentic AI within 6–9 months. The company also generated **189 AI use cases across 9 departments**, including demand forecasting and replenishment, but these are **analysis and use-case layers, not a governed execution layer** with structural human approval and auditable decision trails.

**The gap Veyronica fills:** V-Mart has procurement digitisation (DigiProc) and AI-driven analysis. It does not publicly demonstrate a **structural governed execution loop** where:

1. an agent prepares a write action,
2. a deterministic policy engine decides whether human approval is required,
3. a named human approves or rejects with a recorded reason,
4. the ERP write occurs only after approval, and
5. every step is logged in a queryable audit trail.

**This matches what the problem statement asks for:** two or more enterprise applications connected, agent decision-making, human-in-the-loop for sensitive decisions, dashboards, audit trails, and measurable efficiency gain.

> **Before presenting:** verify every figure above (497 stores, 27 states, 6–10 min vs ~1 min, 189 use cases, 50% / 6–9 months) against the original sources and keep the links in your slide notes.

---

## 2. Solution Architecture

### 2.1 The One Hero Workflow (Build Only This)

**Store Replenishment → Governed Purchase Order Approval → ERP Write**

```text
[Signal]     Store inventory falls below reorder threshold
     ↓
[Constraint] Deterministic checks: MOQ, lead time, budget headroom, credit limit
     ↓
[Draft]      Agent drafts purchase order + supplier email (no write yet)
     ↓
[Route]      Policy engine decides: auto-approve / Store Manager / Regional Manager
     ↓
[Pause]      Workflow persists state and waits (structural human approval gate)
     ↓
[Decide]     Human approves or rejects (with reason)
     ↓
[Execute]    Only on approval: ERP adapter creates PO; supplier email sent; audit event written
     ↓
[Record]     Full audit trail + dashboard metric update
```

### 2.2 Five Agents + One Orchestrator

| Agent | Role | Write Access | Tools |
|---|---|---|---|
| **Inventory Signal Agent** | Monitors stock, detects below-threshold SKUs, produces a prioritised signal list | **None (read-only)** | `read_store_inventory()`, `read_warehouse_stock()`, `read_sales_velocity()` |
| **Constraint Agent** | Runs deterministic business rules; returns PASS/FLAG/FAIL with numeric evidence | **None** | `check_moq()`, `check_lead_time()`, `check_budget_headroom()`, `check_credit_limit()` |
| **Draft Agent** | Builds the structured draft PO and draft supplier email; writes `rationale` and `evidence_refs` | **Draft only** | `draft_purchase_order()`, `draft_supplier_email()` |
| **Routing Agent** | Policy engine: decides approval tier from value, risk class, and check results | **None** | `evaluate_approval_policy()` |
| **Execution & Audit Agent** | Executes the write **only after approval**; writes structured audit events | **ERP write (gated)** | `erp.create_po()`, `send_supplier_email()`, `write_audit_event()` |
| **Orchestrator** | State machine routing between agents; owns correlation ID and state transitions | N/A | N/A |

**Design principle: separation of read, draft, decide, and write.** The agent that identifies a need is never the agent that executes the order. The routing decision is deterministic code, not LLM judgment.

**Where the LLM is (and is not) used:**

| Component | Uses LLM? |
|---|---|
| Inventory Signal Agent | No (plain queries and arithmetic) |
| Constraint Agent | **No** (plain Python rules) |
| Draft Agent | **Yes**, only for the `rationale` text and the supplier email body. A template fallback is used if the LLM call fails or times out |
| Routing Agent | **No** (deterministic policy function) |
| Execution & Audit Agent | No |

> **Code decides. AI explains.**

### 2.3 Human-in-the-Loop Approval Tiers (Deterministic Policy)

| Condition | Approval Required From |
|---|---|
| `total_value ≤ ₹10,000` AND `supplier in approved_list` AND no FAIL checks | **Auto-approve** (logged, executed) |
| `₹10,000 < total_value ≤ ₹50,000` | **Store Manager** |
| `total_value > ₹50,000` OR any FAIL check | **Regional Procurement Manager** |
| `risk_class = high` | **Always a named human**, regardless of value |

Precedence rules are defined unambiguously in [Section 4.3](#43-approval-routing-policy).

### 2.4 Why Temporal + LangGraph (Say This to Judges)

> "LangGraph defines what the agent does. Temporal guarantees that the human approval pause is durable: the workflow can wait for a manager for hours, survive a server restart, and resume exactly where it paused. We are not using a chat confirmation as an approval gate. We are using a database-persisted, user-attributed approval record enforced by a state machine."

---

## 3. Tech Stack

| Layer | Technology | Why This Choice |
|---|---|---|
| **Agent orchestration** | **LangGraph** (StateGraph) | State-machine model maps directly to the workflow |
| **Durable execution / HITL** | **Temporal** (Python SDK) | Makes the approval pause survive process death and wait indefinitely at no cost |
| **Backend API** | **FastAPI** + Pydantic v2 | Typed request/response schemas; fast to build |
| **Database** | **PostgreSQL** | Draft store, approvals, append-only audit event log, simulated ERP tables |
| **ORM / migrations** | SQLAlchemy 2 + Alembic (or plain `.sql` migrations) | Keep it simple |
| **Frontend** | **React 18 + Vite + TypeScript + Tailwind CSS + Recharts** | Fast dev loop; dashboard with cycle-time charts |
| **LLM** | OpenAI GPT-4o / Anthropic Claude / Google Gemini via a single `LLMClient` wrapper | Model-agnostic so you can swap if rate-limited |
| **Deployment** | **Docker** + Railway or Render (backend + worker) + Vercel (frontend) | Judge-accessible URL |
| **Temporal hosting** | **Temporal Cloud free tier** or local Docker Temporal | Avoid building a durable execution engine in 30 hours |

**Do not use:** a full authentication framework, Kubernetes, microservices, or message queues beyond Temporal.

> **Hour-2 verification task:** confirm the exact LangGraph-on-Temporal integration package and version you will use. If it is not available or unstable, use the fallback in [Section 17](#17-risks-and-fallbacks) (Temporal workflow orchestrating one activity per agent node). The structural pause must be implemented by Temporal either way.

---

## 4. Business Rules (Single Source of Truth)

All thresholds live in environment variables / a single `policy.py` config. No rule is duplicated in prompts or UI code.

### 4.1 Replenishment Signal Rules

| Parameter | Value | Notes |
|---|---|---|
| `days_of_cover` | `current_stock / sales_velocity_7d` | Velocity is units per day averaged over 7 days |
| `reorder_threshold` | `REORDER_COVER_DAYS × sales_velocity_7d` | `REORDER_COVER_DAYS = 6` |
| Signal raised when | `current_stock < reorder_threshold` | One signal per store-SKU |
| `TARGET_COVER_DAYS` | `14` | Cover the order should restore |
| Priority | Ascending `days_of_cover` | Lowest cover first |

**Order quantity per line:**

```text
needed   = ceil(TARGET_COVER_DAYS × velocity − current_stock)
qty      = max(MOQ, round_up_to_pack_size(needed))      # pack size = 10
line_val = qty × unit_cost
PO value = Σ line_val   (one PO per supplier per run)
```

### 4.2 Deterministic Checks

Each check is a plain Python function returning a `CheckResult` with `PASS`, `FLAG`, or `FAIL` plus `numeric_evidence`.

| Check | PASS | FLAG | FAIL |
|---|---|---|---|
| **MOQ** | every line `qty ≥ MOQ` | n/a | any line `qty < MOQ` |
| **Lead time** | max line lead time ≤ 7 days | 8–10 days | > 10 days |
| **Budget headroom** | PO value ≤ 50% of store's remaining monthly budget | 50–100% of remaining budget | PO value > remaining budget |
| **Credit limit** | PO value ≤ 50% of supplier's remaining credit | 50–100% of remaining credit | PO value > remaining credit |

`numeric_evidence` must always include the raw numbers used (for example `{"po_value": 42000, "budget_remaining": 60000, "pct_of_headroom": 70.0}`). The lead-time evidence additionally includes `stockout_gap_days = max(0, lead_time − days_of_cover)` for information only.

### 4.3 Approval Routing Policy

Evaluated top to bottom; the first matching rule wins.

| # | Rule | Result |
|---|---|---|
| 1 | Any check is `FAIL` | **Regional Procurement Manager** |
| 2 | `risk_class = high` | **Regional Procurement Manager** (always a named human) |
| 3 | `total_value > STORE_MANAGER_LIMIT` (₹50,000) | **Regional Procurement Manager** |
| 4 | `total_value > AUTO_APPROVE_LIMIT` (₹10,000) | **Store Manager** |
| 5 | Supplier **not** in approved list | **Store Manager** |
| 6 | Otherwise (`≤ ₹10,000`, approved supplier, no FAIL) | **Auto-approve** (logged and executed) |

**Risk class (deterministic):**

| Class | Condition |
|---|---|
| `high` | any FAIL, OR supplier not approved, OR `total_value > 2 × STORE_MANAGER_LIMIT` |
| `medium` | at least one FLAG |
| `low` | all PASS |

FLAGs never block on their own, but they are always shown on the decision card and recorded in the audit payload.

### 4.4 Reference Policy Implementation

```python
# backend/app/policy/routing.py
from decimal import Decimal
from typing import Literal

ApprovalTier = Literal["auto", "store_manager", "regional_manager"]

def classify_risk(checks, total_value: Decimal, supplier_approved: bool, store_manager_limit: Decimal):
    if any(c.status == "FAIL" for c in checks) or not supplier_approved or total_value > 2 * store_manager_limit:
        return "high"
    if any(c.status == "FLAG" for c in checks):
        return "medium"
    return "low"

def evaluate_approval_policy(checks, total_value, supplier_approved, risk_class,
                             auto_limit: Decimal, store_manager_limit: Decimal) -> ApprovalTier:
    if any(c.status == "FAIL" for c in checks):
        return "regional_manager"
    if risk_class == "high":
        return "regional_manager"
    if total_value > store_manager_limit:
        return "regional_manager"
    if total_value > auto_limit:
        return "store_manager"
    if not supplier_approved:
        return "store_manager"
    return "auto"
```

### 4.5 Identity Without Authentication

Full auth is out of scope, but approvals must still be **user-attributed**. The UI header has an **"Acting as"** persona switcher backed by a seeded `approvers` table. Every decision records `decided_by` (approver ID) and `decided_by_role`. The backend rejects a decision if the persona's role cannot satisfy `assigned_role` (a Regional Manager may decide Store Manager approvals; the reverse is not allowed).

| Approver ID | Name | Role | Store |
|---|---|---|---|
| `APR-SM-214` | Priya Sharma | Store Manager | STORE-214 |
| `APR-SM-087` | Rakesh Verma | Store Manager | STORE-087 |
| `APR-RM-001` | Anita Deshmukh | Regional Procurement Manager | All |

---

## 5. Data Models

### 5.1 `ReplenishmentSignal`

```python
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
```

### 5.2 `CheckResult`

```python
class CheckResult(BaseModel):
    check_name: Literal["moq", "lead_time", "budget_headroom", "credit_limit"]
    status: Literal["PASS", "FLAG", "FAIL"]
    reason: str
    numeric_evidence: dict
```

### 5.3 `DraftAction`

```python
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
    tool_args: dict                 # includes supplier_id, store_id, lines: list[DraftLine]
    risk_class: Literal["low", "medium", "high"]
    total_value: Decimal
    rationale: str                  # LLM-written, labelled "AI-generated explanation" in UI
    evidence_refs: list[str]        # signal_ids, check names, adapter record ids
    check_results: list[CheckResult]
    draft_status: Literal["draft", "pending_approval", "approved", "rejected", "executed"]
```

### 5.4 `ApprovalRequest`

```python
class ApprovalRequest(BaseModel):
    approval_id: str
    action_id: str
    run_id: str
    assigned_role: Literal["store_manager", "regional_manager"]
    requested_at: datetime
    status: Literal["pending", "approved", "rejected"]
    decided_by: str | None
    decided_by_role: str | None
    decided_at: datetime | None
    rejection_reason: str | None      # mandatory on reject, min 20 chars
```

### 5.5 `DecisionRequest` (API input)

```python
class DecisionRequest(BaseModel):
    approver_id: str
    reason: str | None = None         # required (>= 20 chars) when rejecting
```

---

## 6. Database Schema

### 6.1 Core Tables

```sql
CREATE TABLE runs (
    run_id            UUID PRIMARY KEY,
    correlation_id    UUID NOT NULL,
    store_id          TEXT NOT NULL,
    temporal_wf_id    TEXT NOT NULL,
    status            TEXT NOT NULL,   -- running | awaiting_approval | completed | rejected | failed
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    awaiting_since    TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    agent_prep_ms     INTEGER,         -- trigger -> approval_requested (measured)
    approval_wait_ms  INTEGER          -- approval_requested -> approval_decided (measured)
);

CREATE TABLE signals (
    signal_id UUID PRIMARY KEY,
    run_id UUID REFERENCES runs(run_id),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE draft_actions (
    action_id UUID PRIMARY KEY,
    run_id UUID REFERENCES runs(run_id),
    action_type TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    tool_args JSONB NOT NULL,
    risk_class TEXT NOT NULL,
    total_value NUMERIC(14,2) NOT NULL,
    rationale TEXT NOT NULL,
    evidence_refs JSONB NOT NULL,
    check_results JSONB NOT NULL,
    draft_status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE approvers (
    approver_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,                 -- store_manager | regional_manager
    store_id TEXT
);

CREATE TABLE approval_requests (
    approval_id UUID PRIMARY KEY,
    action_id UUID REFERENCES draft_actions(action_id),
    run_id UUID REFERENCES runs(run_id),
    assigned_role TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending',
    decided_by TEXT REFERENCES approvers(approver_id),
    decided_by_role TEXT,
    decided_at TIMESTAMPTZ,
    rejection_reason TEXT
);
```

### 6.2 Append-Only Audit Table

```sql
CREATE TABLE audit_events (
    event_id        BIGSERIAL PRIMARY KEY,
    run_id          UUID NOT NULL,
    correlation_id  UUID NOT NULL,
    event_type      TEXT NOT NULL,
    actor_type      TEXT NOT NULL,      -- agent | human | system
    actor_id        TEXT NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_run ON audit_events(run_id, event_id);
CREATE INDEX idx_audit_type ON audit_events(event_type);

-- Enforce append-only: reject UPDATE and DELETE loudly (preferred over silent rules)
CREATE OR REPLACE FUNCTION audit_events_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();
```

**Event types:** `run_started`, `signal_detected`, `data_read`, `constraint_checked`, `action_drafted`, `approval_requested`, `approval_decided`, `action_executed`, `action_rejected`, `run_completed`, `run_failed`.

**Rule:** every state transition writes exactly one audit event with `run_id`, `correlation_id`, `event_type`, `actor_type`, `actor_id`, and a JSONB payload.

### 6.3 Simulated Source-System Tables

Seeded by `scripts/seed.py`: `stores` (with `monthly_budget`, `budget_spent`), `skus`, `store_stock`, `warehouse_stock`, `suppliers` (with `approved`, `credit_limit`, `credit_outstanding`, `email`), `purchase_orders` (the simulated ERP target of `create_purchase_order`), `sent_emails`.

---

## 7. LangGraph State and Temporal Workflow

### 7.1 Graph State

```python
class ReplenishmentState(TypedDict):
    run_id: str
    correlation_id: str
    store_id: str
    signals: list[ReplenishmentSignal]
    checks_by_supplier: dict[str, list[CheckResult]]
    drafts: list[DraftAction]
    route: dict                 # {tier, risk_class, assigned_role}
    approval: ApprovalRequest | None
    execution_result: dict | None
    status: str
```

### 7.2 Nodes

| Node | Calls | Writes audit event(s) |
|---|---|---|
| `signal_node` | Inventory adapter (read-only) | `run_started`, `data_read`, `signal_detected` |
| `constraint_node` | Deterministic check functions | `constraint_checked` (one per check) |
| `draft_node` | Draft Agent (LLM for text only) | `action_drafted` |
| `route_node` | `evaluate_approval_policy()` | `approval_requested` (or auto-approval notice) |
| `approval_gate_node` | Waits for Temporal signal | `approval_decided` |
| `execute_node` | ERP + supplier adapters | `action_executed` or `action_rejected` |
| `audit_node` | Finalises run metrics | `run_completed` / `run_failed` |

Edges: `signal → constraint → draft → route → (auto → execute) | (human → approval_gate → execute | end_rejected) → audit`.

### 7.3 Temporal Workflow Skeleton

```python
@workflow.defn
class ReplenishmentWorkflow:
    def __init__(self) -> None:
        self._decision: DecisionSignal | None = None

    @workflow.signal
    def decision(self, d: DecisionSignal) -> None:
        self._decision = d

    @workflow.run
    async def run(self, params: RunParams) -> RunResult:
        await workflow.execute_activity(signal_activity, params, start_to_close_timeout=timedelta(seconds=60))
        await workflow.execute_activity(constraint_activity, params, start_to_close_timeout=timedelta(seconds=60))
        drafts = await workflow.execute_activity(draft_activity, params, start_to_close_timeout=timedelta(seconds=120))
        route = await workflow.execute_activity(route_activity, drafts, start_to_close_timeout=timedelta(seconds=30))

        if route.tier != "auto":
            await workflow.execute_activity(create_approval_activity, route, start_to_close_timeout=timedelta(seconds=30))
            # STRUCTURAL PAUSE: durable, survives worker/server restarts. No sleep, no in-memory boolean.
            await workflow.wait_condition(lambda: self._decision is not None)
            if self._decision.outcome == "rejected":
                await workflow.execute_activity(record_rejection_activity, self._decision, start_to_close_timeout=timedelta(seconds=30))
                return RunResult(status="rejected")

        result = await workflow.execute_activity(execute_activity, drafts, start_to_close_timeout=timedelta(seconds=60))
        await workflow.execute_activity(finalise_activity, result, start_to_close_timeout=timedelta(seconds=30))
        return RunResult(status="completed")
```

Activities are idempotent (keyed by `action_id`) so Temporal retries cannot create duplicate POs.

### 7.4 Approve/Reject Contract

```python
async def _decide(approval_id: str, outcome: Literal["approved", "rejected"], body: DecisionRequest):
    # 1. Validate approval exists, is pending, and approver role satisfies assigned_role
    # 2. If rejecting: require body.reason with len >= 20
    # 3. Persist the decision in Postgres (user-attributed: decided_by, decided_by_role, decided_at)
    # 4. Emit audit_event: approval_decided (actor_type=human, actor_id=approver_id)
    # 5. THEN send Temporal signal `decision` to the workflow
    # 6. Return immediately; execution is async
```

**Critical:** the approval decision must be persisted **before** the workflow resumes. A second decision on the same approval returns `409 Conflict`.

---

## 8. API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/workflows/replenishment/trigger` | Start a new workflow run for a `store_id` |
| `GET` | `/api/runs` | List runs with state, duration, outcome |
| `GET` | `/api/runs/{run_id}` | Full run detail (signals, checks, drafts, approval, events) |
| `GET` | `/api/approvals/pending` | Pending approval queue (filterable by role) |
| `GET` | `/api/approvals/{approval_id}` | Decision card payload |
| `POST` | `/api/approvals/{approval_id}/approve` | Approve; resume workflow |
| `POST` | `/api/approvals/{approval_id}/reject` | Reject with mandatory reason (min 20 chars) |
| `GET` | `/api/audit` | Query audit events (`run_id`, `event_type`, `actor_id`, date range) |
| `GET` | `/api/dashboard/metrics` | Dashboard aggregate metrics |
| `GET` | `/api/adapters/health` | Adapter status (labelled simulated) |
| `GET` | `/api/approvers` | Persona list for the "Acting as" switcher |

**Dashboard metrics response (shape):**

```json
{
  "total_runs": 12,
  "pending_approvals": 2,
  "approved": 7,
  "rejected": 1,
  "auto_approved": 2,
  "avg_agent_prep_seconds": 14.2,
  "avg_approval_wait_seconds": 96.0,
  "manual_baseline_minutes": {"low": 6, "high": 10},
  "digiproc_baseline_minutes": 1
}
```

---

## 9. UI Screens

| Screen | What It Shows |
|---|---|
| **Home / Trigger** | Store selector + "Run Replenishment Check" button + last run summary + "Simulated against Ginesys/retail ERP schema" badge |
| **Run Detail** | Step-by-step timeline: signal → checks → draft → approval → execution, with live status |
| **Approval Queue** | Pending approvals with value, SKU count, assigned role, risk badge |
| **Approval Detail (Decision Card)** | Draft PO summary, agent rationale, check results, evidence, risk class, approver role, Approve/Reject buttons |
| **Audit Trail** | Filterable table of events with expandable JSON payload |
| **Dashboard** | Metric cards + bar chart comparing manual PO creation (6–10 min), DigiProc (~1 min), and measured Veyronica agent prep time |
| **Future Extensibility** | Static page (see Section 22). Not functional |

Global header: Veyronica logo/name, "Acting as" persona switcher, adapter-health indicator.

### 9.1 Approval Decision Card (Exact Content)

```text
┌─────────────────────────────────────────────────────────┐
│  APPROVAL REQUIRED: HIGH VALUE                           │
│  Assigned to: Store Manager                              │
├─────────────────────────────────────────────────────────┤
│  Action: Create Purchase Order                           │
│  Supplier: Supplier A (ID: SUP-1042)                     │
│  Line items: 3 SKUs, 130 units total                     │
│  Total value: ₹42,000                                    │
│                                                          │
│  WHY THIS ACTION:  (AI-generated explanation)            │
│  "Store 214 has 4 days of cover for SKU-8821 (jeans)     │
│  at a 7-day sales velocity of 6 units/day. Reordering    │
│  60 units restores 14-day cover."                        │
│                                                          │
│  DETERMINISTIC CHECKS:  (computed by code)               │
│  ✅ MOQ: PASS — 60 units ≥ 50-unit MOQ                   │
│  ✅ Lead time: PASS — 6 days ≤ 7-day threshold           │
│  ⚠️ Budget: FLAG — ₹42,000 = 70% of ₹60,000 headroom     │
│  ✅ Credit limit: PASS — ₹1.2L headroom available        │
│                                                          │
│  IF APPROVED: PO will be created in ERP and supplier     │
│  email will be sent to supplier-a@example.com            │
├─────────────────────────────────────────────────────────┤
│  [ Approve ]        [ Reject — reason required ]          │
└─────────────────────────────────────────────────────────┘
```

The card must visually separate **"Computed by code"** (checks) from **"AI-generated explanation"** (rationale). Every check row is expandable to show its `numeric_evidence`.

---

## 10. Adapter Layer (Simulated, Clearly Labelled)

Label in the UI as **"Simulated against Ginesys/retail ERP schema"**, never "dummy data."

```python
class InventoryAdapter(Protocol):
    async def read_store_stock(self, store_id: str, sku: str) -> StockRecord: ...
    async def read_warehouse_stock(self, sku: str) -> StockRecord: ...
    async def read_sales_velocity(self, store_id: str, sku: str) -> float: ...

class ERPAdapter(Protocol):
    async def read_supplier(self, supplier_id: str) -> SupplierRecord: ...
    async def read_purchase_history(self, supplier_id: str) -> list[PORecord]: ...
    async def read_budget(self, store_id: str) -> BudgetRecord: ...
    async def create_purchase_order(self, draft: DraftAction) -> POResult: ...

class SupplierAdapter(Protocol):
    async def send_email(self, to: str, subject: str, body: str) -> EmailResult: ...
```

Three adapter interfaces, each with a Postgres-backed simulated implementation. Swapping in a real Ginesys client later means implementing the same Protocols.

### 10.1 Seed Data (V-Mart-Style)

**SKU master (12 SKUs):**

| SKU | Name | Store Price | Unit Cost | MOQ | Supplier | Lead Time |
|---|---|---|---|---|---|---|
| SKU-8821 | Men's Slim Jeans | ₹599 | ₹360 | 50 | SUP-1042 | 5 days |
| SKU-7732 | Women's Kurta Set | ₹449 | ₹270 | 40 | SUP-1042 | 6 days |
| SKU-9015 | Men's Cargo Trousers | ₹549 | ₹320 | 30 | SUP-1042 | 6 days |
| SKU-4410 | Kids' Cotton T-Shirt | ₹199 | ₹120 | 100 | SUP-2087 | 3 days |
| SKU-4502 | Kids' Denim Shorts | ₹299 | ₹170 | 60 | SUP-2087 | 4 days |
| SKU-4618 | Girls' Cotton Frock | ₹349 | ₹200 | 50 | SUP-2087 | 4 days |
| SKU-3301 | Men's Formal Shirt | ₹399 | ₹230 | 60 | SUP-3011 | 4 days |
| SKU-3355 | Men's Formal Trousers | ₹599 | ₹350 | 40 | SUP-3011 | 5 days |
| SKU-3402 | Men's Casual Blazer | ₹1,299 | ₹780 | 20 | SUP-3011 | 9 days |
| SKU-6120 | Women's Leggings | ₹249 | ₹140 | 80 | SUP-4055 | 3 days |
| SKU-6188 | Men's Cotton Vest (3-pack) | ₹279 | ₹160 | 60 | SUP-4055 | 3 days |
| SKU-6240 | Women's Cotton Dupatta | ₹199 | ₹110 | 80 | SUP-4055 | 4 days |

**Suppliers:**

| Supplier | Name | Approved | Credit Limit | Outstanding | Email |
|---|---|---|---|---|---|
| SUP-1042 | Supplier A | Yes | ₹3,00,000 | ₹1,80,000 | supplier-a@example.com |
| SUP-2087 | Supplier B | Yes | ₹2,00,000 | ₹90,000 | supplier-b@example.com |
| SUP-3011 | Supplier C | Yes | ₹2,50,000 | ₹2,40,000 | supplier-c@example.com |
| SUP-4055 | Supplier D | **No** | ₹1,00,000 | ₹20,000 | supplier-d@example.com |

**Stores:** `STORE-214`, `STORE-087`, `STORE-312`. Each store carries all 12 SKUs (36 store-SKU rows). Monthly budgets: STORE-214 ₹1,50,000 (₹90,000 spent, ₹60,000 headroom), STORE-087 ₹1,00,000 (₹30,000 spent), STORE-312 ₹80,000 (₹70,000 spent, near cap).

**Hero scenario (STORE-214), guaranteed by the seed script to produce the decision card in Section 9.1:**

| SKU | Stock | Velocity/day | Cover (days) | Threshold | Order Qty | Line Value |
|---|---|---|---|---|---|---|
| SKU-8821 | 24 | 6 | 4.0 | 36 | 60 | ₹21,600 |
| SKU-7732 | 12 | 3 | 4.0 | 18 | 40 (MOQ) | ₹10,800 |
| SKU-9015 | 8 | 2 | 4.0 | 12 | 30 (MOQ) | ₹9,600 |
| | | | | | **130 units** | **₹42,000** |

Result: PO to SUP-1042, value ₹42,000 → routes to **Store Manager** (rule 4), budget check FLAG (70% of ₹60,000 headroom), all others PASS.

**Additional demo scenarios (seeded, selectable by store):**

| Store | Expected Outcome |
|---|---|
| STORE-214 | Store Manager approval (hero scenario above) |
| STORE-087 | Small PO ≤ ₹10,000 from approved supplier → **auto-approve** path |
| STORE-312 | Large PO or FAIL (budget exceeded) → **Regional Procurement Manager** |

Use a fixed random seed so every judge sees the same data after a reset. Provide a `POST /api/admin/reset-demo` (unauthenticated, demo-only) or a `make reset` command to restore seed state.

---

## 11. Differentiators (Pick Exactly Two)

**Recommended pair (build these):**

1. **"Code decides, AI explains" split visible in the UI.** Deterministic PASS/FLAG/FAIL with numeric evidence shown alongside a clearly labelled agent rationale.
2. **Supplier email as a second gated action.** Approval covers both the PO and the supplier email; the email is only sent after approval, and both appear in the audit trail.

**Not building (stretch only if ahead of schedule):**

- *Rejection → threshold learning:* the manager rejects because value was too high; the system records the reason and suggests an adjusted auto-approve threshold.

---

## 12. What to Explicitly Skip

- Full authentication / RBAC (use the persona switcher)
- Multi-department dashboards
- HR resume screening, blog writing, competitor analysis
- Real Ginesys API integration
- Chat interface with the agent
- Admin configuration panels
- Hash-bound cryptographic approval
- Multiple simultaneous workflow types (multiple *runs* of the one workflow are fine)

---

## 13. Repository Structure

```text
veyronica/
├── PROJECT.md
├── README.md
├── docker-compose.yml
├── Makefile
├── .env.example
├── backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── alembic/ (or migrations/*.sql)
│   └── app/
│       ├── main.py                    # FastAPI app
│       ├── config.py                  # env + policy thresholds
│       ├── db.py
│       ├── models/                    # Pydantic + SQLAlchemy models
│       ├── api/                       # routers: workflows, runs, approvals, audit, dashboard
│       ├── agents/
│       │   ├── signal_agent.py
│       │   ├── constraint_agent.py
│       │   ├── draft_agent.py
│       │   ├── routing_agent.py
│       │   └── execution_agent.py
│       ├── checks/                    # moq.py, lead_time.py, budget.py, credit.py (no LLM)
│       ├── policy/routing.py
│       ├── graph/                     # LangGraph StateGraph + nodes
│       ├── temporal/
│       │   ├── workflows.py
│       │   ├── activities.py
│       │   └── worker.py
│       ├── adapters/                  # inventory.py, erp.py, supplier.py (+ Protocols)
│       ├── llm/client.py              # LLMClient wrapper with template fallback
│       └── audit/writer.py
├── scripts/
│   └── seed.py
├── tests/
│   ├── test_checks.py
│   ├── test_policy.py
│   ├── test_api_approvals.py
│   └── test_restart_durability.md     # manual procedure
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── pages/ (Home, RunDetail, ApprovalQueue, ApprovalDetail, AuditTrail, Dashboard, Future)
        ├── components/ (DecisionCard, CheckRow, RiskBadge, Timeline, PersonaSwitcher)
        ├── api/client.ts
        └── main.tsx
```

---

## 14. Local Setup and Environment Variables

### 14.1 Docker Compose Services

| Service | Image / Source | Port |
|---|---|---|
| `postgres` | `postgres:16` | 5432 |
| `temporal` | `temporalio/auto-setup` | 7233 |
| `temporal-ui` | `temporalio/ui` | 8233 |
| `api` | `./backend` (uvicorn) | 8000 |
| `worker` | `./backend` (Temporal worker) | none |
| `frontend` | `./frontend` (Vite dev / static build) | 5173 |

### 14.2 Commands

```bash
cp .env.example .env            # fill in LLM_API_KEY
docker compose up -d --build    # postgres, temporal, api, worker, frontend
make migrate                    # create tables and audit triggers
make seed                       # load simulated Ginesys-schema data
open http://localhost:5173
```

### 14.3 Environment Variables

```env
DATABASE_URL=postgresql://veyronica:veyronica@localhost:5432/veyronica
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=replenishment
LLM_PROVIDER=openai
LLM_API_KEY=...
LLM_MODEL=gpt-4o
LLM_TIMEOUT_SECONDS=20
AUTO_APPROVE_LIMIT=10000
STORE_MANAGER_LIMIT=50000
REORDER_COVER_DAYS=6
TARGET_COVER_DAYS=14
LEAD_TIME_THRESHOLD_DAYS=7
CORS_ORIGINS=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000
```

---

## 15. 30-Hour Build Plan

| Hours | Deliverable | Acceptance Check |
|---|---|---|
| 0–2 | Lock workflow, agents, approval tiers, four deterministic checks. Verify Temporal + LangGraph integration choice. Write demo script | One-page storyboard; integration decision made |
| 2–8 | Scaffold FastAPI + LangGraph + Postgres. Seed data. End-to-end skeleton (no pause yet). Deploy live | `POST /trigger` creates a run and writes audit events |
| 8–14 | Approval gate: Temporal workflow with signal resume; persist decisions; idempotent execute | Approve resumes; reject halts; restart-safe |
| 14–19 | Approval Queue UI and Decision Card; persona switcher | Human can decide without asking the agent anything |
| 19–23 | Audit Trail view and Dashboard metrics + chart | Audit queryable; dashboard live |
| 23–26 | Build the two chosen differentiators | Visible in demo |
| 26–28 | Harden edge cases. Record backup video | Survives 5 consecutive runs |
| 28–30 | Rehearse 60-second demo five times | Answer each likely question in 30 seconds |

**Cut order if behind schedule:** (1) second differentiator polish, (2) dashboard chart styling, (3) audit filters. **Never cut:** the Temporal approval pause, persistence-before-signal, and the audit trail.

---

## 16. Testing Plan

### 16.1 Unit Tests (table-driven)

- **Checks:** boundary values for MOQ, lead time (7/8/10/11 days), budget headroom (50% / 100% / over), credit limit.
- **Policy:** every row of the routing table, including precedence conflicts (for example ₹8,000 with unapproved supplier → Store Manager; ₹8,000 with a FAIL → Regional Manager; ₹60,000 all PASS → Regional Manager).
- **Quantity calculation:** MOQ floor and pack-size rounding.

### 16.2 Integration Tests

- Trigger run → status becomes `awaiting_approval`, **no row** in `purchase_orders`.
- Approve → `purchase_orders` row exists, audit shows the full event chain, email recorded.
- Reject with reason < 20 chars → `422`; with valid reason → run ends `rejected`, no ERP write.
- Double-approve → `409`.
- Persona with insufficient role → `403`.
- Retry of `execute_activity` does not create a duplicate PO.

### 16.3 Durability Test (manual, must pass before demo)

1. Trigger a run that needs approval.
2. `docker compose restart api worker` (and separately `docker compose restart postgres temporal`).
3. Reload the UI: the approval is still in the queue.
4. Approve: the workflow resumes and executes exactly once.

---

## 17. Risks and Fallbacks

| Risk | Fallback |
|---|---|
| LangGraph-on-Temporal integration package is unavailable or unstable | Temporal workflow orchestrates one **activity per node**; LangGraph defines/executes node logic inside activities. The durable pause stays in Temporal |
| Temporal Cloud or local Temporal setup eats hours | Use `temporalio/auto-setup` in Docker Compose; do not self-build durability |
| LLM rate limit or latency | `LLMClient` swaps providers via env; template rationale/email fallback so the demo never blocks |
| LLM output contradicts the deterministic numbers | Rationale is generated from a structured evidence object only; a post-check verifies that quoted figures match `numeric_evidence`, otherwise use the template |
| Judges' demo data drifts after many runs | `make reset` / reset endpoint restores seed state |
| Duplicate ERP writes on retry | Idempotency key = `action_id` on `create_purchase_order` |
| Scope creep | Section 12 is binding |

---

## 18. The 60-Second Demo Script

**0–10s: The pain**
"V-Mart runs 497 stores in Tier-II and Tier-III India on Ginesys ERP. Even after digitising procurement, a purchase order still spans requisition, budget approval, quotation, negotiation, and three-way matching, and each approval leaves no structured execution record. The CFO has publicly said V-Mart is replacing RPA with agentic AI. Veyronica is the governed execution layer that makes that safe."

**10–25s: The agent prepares**
Trigger the workflow for STORE-214. Show the Signal Agent identifying three SKUs below threshold. Show the Constraint Agent's deterministic checks. Show the Draft Agent's proposed PO and rationale on the decision card.

**25–40s: The structural pause**
"The workflow has stopped. No ERP write has happened. The draft is persisted, the approval is assigned to the Store Manager, and the decision card shows the evidence. I can approve or reject without asking the agent anything."

**40–50s: The human decides**
Switch persona to Priya Sharma (Store Manager). Click **Approve**. The workflow resumes, the ERP creates the PO, and the audit trail shows: `action_drafted → approval_requested → approval_decided (Store Manager) → action_executed (PO #…)`.

**50–60s: Impact and extensibility**
"The dashboard shows manual PO creation at 6–10 minutes versus Veyronica's measured agent preparation time, with a complete audit record. The same architecture extends to vendor onboarding, invoice approval, and store exception resolution."

**Likely judge questions (prepare 30-second answers):**

- *What did you actually build vs. simulate?* → "We built the agents, deterministic checks, policy engine, durable approval workflow, audit trail, and UI. The Ginesys ERP, inventory, and supplier systems are simulated behind the same Protocol interfaces a real integration would implement."
- *What happens if the server dies while waiting?* → Temporal persists the workflow; restart and the approval is still pending.
- *Can the LLM approve its own order?* → No. Routing is deterministic code, and the execution step only runs after a persisted human decision (or a policy-defined auto-approval for small orders).
- *Is the 'time saved' real?* → We report agent preparation time and human wait time separately, against the documented 6–10 minute manual baseline.

---

## 19. SIH 2026 Rubric Mapping

| Criterion | How Veyronica Scores |
|---|---|
| Problem Understanding | Names V-Mart's specific procurement pain with sourced numbers |
| Novelty & Innovation | Structural governed execution: deterministic policy routing, durable approval pause, append-only audit trail |
| Technical Depth & Feasibility | Five agents, LangGraph, Temporal, deterministic checks, policy engine, gated write, event-sourced audit |
| Prototype Demo | Live loop that pauses, resumes, records the approver, and produces an audit trail, plus a dashboard with cycle-time delta |
| Social Relevance & Impact | Impact on a major Indian retailer serving Tier-II/III towns; quantified preparation-time reduction |
| Presentation & Communication | 60-second narrative with before/after metric, live approval, clear extensibility statement |

---

## 20. AI Coding Agent Instructions (Paste Into the IDE)

```text
You are building a 30-hour hackathon prototype called "Veyronica" (V-Mart Governed Agentic Replenishment Platform).

Read PROJECT.md fully before writing any code. First, summarise your understanding in a few lines, list any assumptions, then propose the file structure (Section 13) and begin building. Use the name "Veyronica" everywhere (UI title, README, package names, config).

Build order (do not deviate):
1. FastAPI backend with Postgres (SQLAlchemy + Alembic or simple SQL migrations), including the append-only audit_events table with triggers.
2. Seed script and the three simulated adapters with Protocol interfaces (Inventory, ERP, Supplier), labelled "Simulated against Ginesys/retail ERP schema" in the UI.
3. Deterministic check functions in plain Python (no LLM calls). Each returns a CheckResult with PASS/FLAG/FAIL and numeric_evidence, using the rules in Section 4.
4. Policy engine (evaluate_approval_policy) exactly as specified in Section 4.3/4.4, with table-driven unit tests.
5. LangGraph StateGraph with nodes: signal_node, constraint_node, draft_node, route_node, approval_gate_node, execute_node, audit_node.
6. Temporal workflow wrapping the graph. The approval gate must use workflow.wait_condition (or equivalent) until an approval signal arrives. The approval decision must be persisted in Postgres BEFORE the signal is sent. Do not simulate the pause with a sleep or an in-memory boolean.
7. React + Vite + TypeScript + Tailwind frontend with six screens: Home/Trigger, Run Detail, Approval Queue, Approval Detail (Decision Card), Audit Trail, Dashboard. Include the "Acting as" persona switcher.
8. Recharts bar chart comparing manual PO creation (6-10 min baseline), DigiProc (~1 min), and measured Veyronica agent prep time.
9. The two differentiators in Section 11.

Do NOT build: authentication, RBAC, admin panels, multiple workflow types, chat interface, or any HR/Marketing/Finance department features. Those go on a static "future extensibility" page only.

The single most important requirement: the approval gate must be a structural pause. If the server restarts while an approval is pending, the workflow must be recoverable and the pending approval must still be in the queue after restart. Use Temporal for this.

Every state transition must write an append-only audit event with run_id, correlation_id, event_type, actor_type, actor_id, and a JSONB payload.

After each major step, tell me what you built and how to run or test it.
```

---

## 21. Definition of Done

- [ ] Judge can open the deployed URL and trigger the workflow without setup
- [ ] Workflow visibly pauses at pending approval; **no ERP write before approval**
- [ ] Decision card shows draft action, rationale, check results with numeric evidence, and approver role
- [ ] Approving resumes and executes; rejecting halts and records the reason
- [ ] Refreshing the page while pending does not lose the approval
- [ ] Restarting the backend while pending does not lose the approval (Temporal durability)
- [ ] Audit trail shows every event linked by `run_id`
- [ ] Dashboard shows total runs, pending, approved/rejected, average approval wait, and the cycle-time chart
- [ ] Both chosen differentiators are visible in the demo
- [ ] Backup demo video exists (under 3 minutes)
- [ ] Can answer "What did you actually build vs. simulate?" in one sentence

---

## 22. Future Extensibility (Slide Only, Do Not Build)

The same architecture (signal → deterministic checks → draft → policy routing → durable approval → gated write → audit) extends to:

- **Vendor onboarding:** document extraction → compliance checks → draft vendor record → procurement approval → ERP creation
- **Invoice approval:** three-way matching → deterministic tolerance checks → finance approval → payment scheduling
- **Store exception resolution:** order allocation failure → cross-system investigation → resolution proposal → customer service approval → notification
- **Finance workflow replacement:** V-Mart's CFO targeted 50% of finance functions for agentic AI; this is the governed execution layer

**One loop, built completely, is the proof. The roadmap is the slide.**
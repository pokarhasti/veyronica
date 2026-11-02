# Veyronica — Implementation Progress & Tracking

This tracker organizes all items from `veyronica_audit_bug_report_feature_roadmap.md` in strict dependency and priority order.

## Implementation Order Rationale
1. **Phase 1 (Items 1–4): Critical P0 Bugs & Security.** Fixes immediate crashes (`JSONB` array mapping in DecisionCard), metric corruption (`EXTRACT(EPOCH FROM ...)` for latency), unauthorized cross-store approvals (missing `store_id` scope check), and store naming mismatches.
2. **Phase 2 (Items 5–10): Core Architecture & Multi-Supplier Support.** Eliminates the single-draft bottleneck (`drafts[0]`) across workflows/activities, activates LangGraph in the pipeline, implements deterministic LLM numeric hallucination guards, adds dual-action email draft previews, shows executed PO/emails on RunDetail, and adds a dedicated paginated Runs page.
3. **Phase 3 (Items 11–16): V-Mart Supply Chain Innovations & Integrity.** Integrates warehouse stock and purchase history adapters, builds warehouse-first DC allocation, inter-store transfers, stockout-gap alert calculation, interactive line quantity overrides in DecisionCard, and SHA-256 cryptographic audit chain verification.
4. **Phase 4 (Items 17–20): Governance, Simulation & Presentation.** Implements rejection-to-policy learning engine, live "What-If" sandbox simulator, multi-supplier tabs, and live 5-stage pipeline stepper.

---

## Master Checklist

| ID | Title | Type | Priority | Status | Files Touched | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1.1** | Fix Nested JSONB Serialization Crash in `draft_activity` | Bug | P0 | Done | `backend/app/temporal/activities.py`, `frontend/src/components/DecisionCard.tsx`, `tests/test_agents.py` | Direct JSON array serialization + defensive frontend checkResults normalization |
| **1.2** | Fix `agent_prep_ms` Millisecond Elapsed Calculation | Bug | P0 | Done | `backend/app/temporal/activities.py` | Replaced EXTRACT(MILLISECONDS) with (EXTRACT(EPOCH) * 1000)::INT across all latency updates |
| **1.4** | Enforce Store-Level Approver Scoping Check | Bug/Security | P0 | Done | `backend/app/api/approvals.py`, `tests/test_api_approvals.py` | Enforced store_id matching on approval decision (403 Forbidden on cross-store approval) |
| **1.5** | Align Store Location Names (Lucknow, Jaipur, Patna) | Bug/UI | P0 | Done | `frontend/src/pages/HomePage.tsx` | Aligned store names in trigger selector and scenario cards with database seed |
| **1.3** | Multi-Supplier Draft Handling (Remove `drafts[0]` bottleneck) | Bug/Core | P1 | Done | `backend/app/temporal/activities.py`, `backend/app/api/approvals.py`, `backend/app/graph/workflow_graph.py`, `tests/test_agents.py` | Route, approve, and execute all generated supplier drafts per run |
| **1.6** | Wire LangGraph Pipeline Execution (`workflow_graph.py`) | Feature/Core | P1 | Done | `backend/app/graph/workflow_graph.py`, `backend/app/temporal/activities.py`, `backend/app/api/workflows.py`, `tests/test_workflow_graph.py` | StateGraph execution connected to activities and /graph endpoints |
| **2.2** | Deterministic LLM Numeric Hallucination Guard (Post-Check) | Feature/Guard | P1 | Pending | `backend/app/llm/client.py`, `backend/app/agents/draft_agent.py`, `frontend/src/components/DecisionCard.tsx` | Programmatic regex validation against authorized `numeric_evidence` |
| **2.1** | Gated Supplier Email Draft Preview in Decision Card | Feature/HITL | P1 | Pending | `backend/app/agents/draft_agent.py`, `frontend/src/components/DecisionCard.tsx` | Preview email body & recipient before approval execution |
| **2.4** | Executed PO & Sent Email Confirmation on Run Detail | Feature/UI | P1 | Pending | `backend/app/api/runs.py`, `frontend/src/pages/RunDetailPage.tsx` | Query and render confirmed Ginesys PO and dispatched vendor emails |
| **1.7** | Dedicated Filterable "Workflow Runs" View | Feature/UI | P1 | Pending | `frontend/src/pages/WorkflowRunsPage.tsx`, `frontend/src/App.tsx` | Separate full paginated list with store/status/tier filters |
| **2.3** | Integrate Unused Adapters (`read_warehouse_stock`, `read_purchase_history`) | Feature | P2 | Pending | `backend/app/adapters/inventory_adapter.py`, `backend/app/adapters/erp_adapter.py`, `backend/app/agents/constraint_agent.py` | Wire into constraint checks and historical analysis |
| **3.1** | Warehouse-First DC Allocation (`WH-NORTH-01` Split) | Innovation | P2 | Pending | `backend/app/agents/constraint_agent.py`, `backend/app/temporal/activities.py` | Check internal warehouse first before spending vendor OTB budget |
| **3.2** | Inter-Store Lateral Stock Transfer Recommender | Innovation | P2 | Pending | `backend/app/agents/constraint_agent.py`, `frontend/src/components/DecisionCard.tsx` | Scan peer V-Mart stores for surplus stock |
| **3.3** | Imminent Stockout-Gap Alert & Lost Revenue Estimator | Innovation | P2 | Pending | `backend/app/checks/lead_time.py`, `frontend/src/components/DecisionCard.tsx` | Highlight days of stockout window and estimated lost revenue |
| **3.4** | Interactive Line-Item Quantity Override in Decision Card | Innovation | P2 | Pending | `frontend/src/components/DecisionCard.tsx`, `backend/app/api/approvals.py` | Allow manager to trim quantities in pack sizes with live check recalculation |
| **3.5** | Cryptographic SHA-256 Audit Trail Integrity Verifier | Innovation | P2 | Pending | `backend/app/api/audit.py`, `frontend/src/pages/AuditTrailPage.tsx` | Hash-chain verification + PostgreSQL trigger check live verification |
| **2.5** | Rejection-to-Policy Learning Engine | Feature | P2 | Pending | `backend/app/models/schema.py`, `backend/app/api/approvals.py`, `frontend/src/pages/FuturePage.tsx` | Structured suggestions from rejections to tune policy thresholds |
| **4.1** | Interactive "What-If" Store & Budget Sandbox | Demo Edge | P2 | Pending | `backend/app/api/admin.py`, `frontend/src/pages/HomePage.tsx` | Live sliders for budget spent, velocity, and approver deactivation |
| **4.2** | Multi-Supplier PO Switcher on Detail Pages | Demo Edge | P2 | Pending | `frontend/src/pages/RunDetailPage.tsx`, `frontend/src/pages/ApprovalDetailPage.tsx` | Multi-tab inspection across multiple vendor PO drafts |
| **4.3** | Architecture & LangGraph + Temporal Live Pipeline Stepper | Demo Edge | P2 | Pending | `frontend/src/components/PipelineStepper.tsx`, `frontend/src/pages/RunDetailPage.tsx` | 5-stage live node status visualizer |

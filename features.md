# Veyronica — Platform Features & Capabilities

Veyronica is an autonomous, governed replenishment desk engineered specifically for V-Mart Retail (497 stores across Tier-II, III, and IV Indian cities). It replaces manual PO creation with durable agentic workflows combining **LangGraph** cognitive graphs, **Temporal** durability, **Gemini 2.5 Flash**, and deterministic enterprise retail rules.

---

## 1. Core Architecture & Orchestration

* **LangGraph Cognitive Graph:**
  * Executes a state graph for cognitive reasoning (`signal_node -> constraint_node -> draft_node -> routing_node`).
  * Emits fine-grained audit events at each state transition and exposes `/api/workflows/graph/topology` and `/simulate`.
* **Temporal Durable Workflows:**
  * Guarantees durable execution with automatic retries and exponential backoff across all activity steps.
  * Implements durable workflow signal pauses (`workflow.wait_condition`) for human-in-the-loop (HITL) authorization gates.
  * Survives server crashes, restarts, and network partitions with automated startup reconciliation.
* **Separation of Concerns ("Code Decides, AI Explains"):**
  * Business rules, financial limits, and order quantities are 100% computed by deterministic Python code.
  * LLMs are strictly isolated to generating plain-English natural language rationale and vendor notification emails.

---

## 2. Autonomous Multi-Agent Pipeline

1. **SignalAgent (Inventory Scanner):**
   * Scans store stock levels across all active SKUs.
   * Calculates 7-day sales velocity and days-of-cover.
   * Emits replenishment signals for SKUs dropping below reorder thresholds.
2. **ConstraintAgent (Deterministic Supply Chain Checks):**
   * Computes pack size multiples and order quantities based on case-pack rules.
   * Evaluates vendor Minimum Order Quantities (MOQ units and INR value).
   * Verifies delivery lead times against maximum allowable thresholds.
   * Checks remaining store monthly Open-to-Buy (OTB) budget headroom.
   * Verifies supplier credit limits and outstanding receivables.
3. **DraftAgent (Cognitive Drafting & Email Assembly):**
   * Formulates structured Ginesys ERP purchase order payloads.
   * Pre-generates drafted outbound supplier dispatch emails.
   * Calls Gemini 2.5 Flash with fallback to deterministic templates.
4. **RoutingAgent (Policy Tiering & Risk Classification):**
   * Classifies order risk into `low`, `medium`, or `high` deterministically.
   * Routes orders to `auto` (<= ₹10,000), `store_manager` (<= ₹50,000), or `regional_manager` (> ₹50,000 or high risk).
5. **ExecutionAgent (Enterprise Dispatch):**
   * Idempotently writes approved purchase orders to Ginesys ERP (`purchase_orders` table).
   * Dispatches supplier confirmation emails (`sent_emails` table).

---

## 3. High-Impact V-Mart Supply Chain Innovations

* **Warehouse-First DC Allocation (`WH-NORTH-01` Split):**
  * Checks central regional distribution center inventory before allocating external vendor orders.
  * Recommends internal DC transfers (2-day transit, ₹0 vendor spend) to preserve store monthly OTB budgets.
* **Inter-Store Lateral Stock Transfer Recommender:**
  * Scans cluster stores for identical SKUs with healthy cover (>7 days) and surplus stock.
  * Identifies lateral rebalancing opportunities across nearby stores to avoid unnecessary vendor MOQs.
* **Imminent Stockout-Gap Alert & Lost Revenue Estimator:**
  * Calculates the unserved demand window: $\text{stockout\_gap} = \text{lead\_time} - \text{days\_of\_cover}$.
  * Computes estimated lost sales revenue at risk during the stockout window to justify expedited shipping.
* **Interactive Line-Item Quantity Override:**
  * Empowers approvers to adjust individual SKU quantities in case-pack multiples inside the Decision Card.
  * Instantly recalculates order totals, budget headroom impact, and submits modified lines upon approval.
* **Cryptographic SHA-256 Audit Trail Integrity Verifier:**
  * Implements deterministic sequential SHA-256 hash chaining across all audit events.
  * Verifies active PostgreSQL immutability database triggers (`trg_audit_no_update`, `trg_audit_no_delete`).
  * Provides a live verification certificate directly in the UI with root hash anchoring.

---

## 4. AI Guardrails & Reliability

* **Deterministic LLM Numeric Hallucination Guard:**
  * Programmatically extracts all numeric tokens from LLM output via regular expressions.
  * Validates every extracted number against authorized evidence (quantities, costs, budget, stock).
  * Automatically reverts to safe deterministic templates if any unauthorized number is detected.
* **Multi-Key Gemini Pool with Failover:**
  * Manages an 8-key API pool with automatic failover on rate limits (HTTP 429) or quota errors.
  * Resolves model aliases dynamically (`gemini-2.5-flash`, `gemini-1.5-flash`).

---

## 5. Governance, Security & Policy Learning

* **Role-Based Authorization & Store Scoping:**
  * Enforces role hierarchies: Regional Managers can approve both Store Manager and Regional tiers; Store Managers can only approve Store Manager tier.
  * Enforces store scoping: Store Managers can only decide orders for their assigned store (HTTP 403 on cross-store decisions).
* **Dual-Action Approval Gate:**
  * Approving simultaneously creates the Ginesys ERP purchase order and dispatches the outbound vendor email.
  * Rejection strictly mandates an explanatory reason (minimum 20 characters) for audit compliance.
* **Rejection-to-Policy Adaptive Learning Engine:**
  * Analyzes human rejection reasons to generate structured policy suggestions.
  * Allows administrators to adopt suggested threshold adaptations into the live engine with a single click.
* **Immutable Append-Only Audit Trail:**
  * PostgreSQL triggers prevent any `UPDATE` or `DELETE` operations on audit logs.
  * Every human approval, agent calculation, and system dispatch is permanently recorded.

---

## 6. Frontend & User Experience

* **Hero Trigger & Scenario Desk (`HomePage.tsx`):**
  * One-click triggering across seeded retail stores (Lucknow, Jaipur, Patna).
  * Interactive **"What-If" Store & Budget Sandbox** with live sliders to simulate budget depletion or demand surges.
* **Dedicated Filterable Workflow Runs View (`WorkflowRunsPage.tsx`):**
  * Full paginated table of runs with store filters, status filters, search bar, and latency metrics.
* **Interactive Decision Card (`DecisionCard.tsx`):**
  * Dual-tab switcher between Ginesys PO lines and drafted outbound vendor emails.
  * Interactive line quantity stepper with live budget headroom recalculation.
  * Visual indicators for hallucination guard status, stockout gaps, and DC allocation savings.
* **Multi-Supplier Draft Switcher:**
  * Tabbed inspection across multiple vendor purchase orders generated within a single cycle.
* **Live 5-Stage Pipeline Stepper (`PipelineStepper.tsx`):**
  * Real-time visual tracking of each stage (`SignalAgent -> ConstraintAgent -> DraftAgent -> RoutingAgent -> ExecutionAgent`).
* **Persona Switcher:**
  * Quick-switching between Priya Sharma (Store Manager 214), Rakesh Verma (Store Manager 087), and Anita Deshmukh (Regional Manager).
* **Operational Analytics Dashboard (`DashboardPage.tsx`):**
  * Real-time metrics on run volumes, pending queues, approvals, rejections, and latency vs. manual baselines.

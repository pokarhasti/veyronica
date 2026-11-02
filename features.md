# Veyronica — Comprehensive Platform Features & Technical Architecture

Veyronica is an autonomous, governed replenishment intelligence platform engineered specifically for **V-Mart Retail** ($497$ department stores across Tier-II, III, and IV Indian cities). The platform eliminates traditional manual purchase order friction while enforcing strict deterministic financial and supply chain constraints.

---

## 1. Core Architectural Pillars

### 1.1 Dual Orchestration: LangGraph + Temporal
* **LangGraph Cognitive Graph (`workflow_graph.py`):**
  * Models agent cognition as a state graph (`StateGraph[ReplenishmentState]`).
  * Structured node transitions: `signal_node` $\rightarrow$ `constraint_node` $\rightarrow$ `draft_node` $\rightarrow$ `routing_node`.
  * Emits fine-grained telemetry events at each node transition.
  * Exposes interactive graph topology (`/api/workflows/graph/topology`) and simulation endpoints (`/api/workflows/graph/simulate`).
* **Temporal Durable Execution (`workflows.py`, `activities.py`):**
  * Guarantees distributed durability, non-blocking execution, and automatic retry backoff across all activity boundaries.
  * Employs `workflow.wait_condition` to pause execution indefinitely during human-in-the-loop (HITL) approval gates without consuming CPU or thread resources.
  * Features automated boot-time reconciliation (`_reconcile_unsignalled_approvals`) that checks PostgreSQL on startup and re-signals any unsignalled Temporal executions after unexpected process restarts.

### 1.2 "Code Decides, AI Explains" (Deterministic Separation of Powers)
* All business logic, pack-size roundups, financial calculations, and risk tiers are evaluated exclusively by deterministic Python algorithms.
* Large Language Models (LLMs) are strictly sandboxed: they generate explanatory plain-English rationales and format outbound vendor communications, never calculating financial figures.

---

## 2. Autonomous Multi-Agent Pipeline

### 2.1 SignalAgent (Inventory Cover Scanner)
* **Inventory Scan:** Continuously monitors store-level stock across active SKUs.
* **Cover Calculation:** Computes 7-day sales velocity ($V_{\text{7d}}$) and days of cover ($C_{\text{days}} = \frac{\text{Current Stock}}{V_{\text{7d}}}$).
* **Threshold Detection:** Emits a `ReplenishmentSignal` when days of cover falls below the SKU lead-time safety threshold.
* **Database Persistence:** Persists every detected signal directly to the `signals` table with run correlation IDs.

### 2.2 ConstraintAgent (Deterministic Supply Chain Validation)
* **Case-Pack Rounding:** Adjusts deficit order quantities to exact vendor pack sizes:
  $$\text{Order Qty} = \max\left(\text{MOQ}, \left\lceil \frac{\text{Deficit}}{\text{Pack Size}} \right\rceil \times \text{Pack Size}\right)$$
* **Minimum Order Quantity (MOQ) Check:** Validates line quantities against vendor minimum order units and total monetary commitments.
* **Lead Time & Cover Gap Check:** Compares vendor delivery lead times against allowable regional limits (PASS: $\le 7$ days, FLAG: $8\text{--}10$ days, FAIL: $> 10$ days).
* **Store Open-to-Buy (OTB) Budget Headroom Check:** Verifies that the order value does not exceed the store's remaining monthly budget ($\text{Monthly Budget} - \text{Budget Spent}$).
* **Supplier Credit Limit Check:** Validates that the order will not breach supplier credit ceilings ($\text{Credit Limit} - \text{Credit Outstanding}$).

### 2.3 DraftAgent (Cognitive Drafting & Outbound Assembly)
* **Ginesys ERP PO Assembly:** Packages validated line items, SKU codes, unit costs, and total values into ERP-ready schemas.
* **Outbound Supplier Notification Email:** Pre-generates personalized vendor notification emails detailing store shipping addresses, requested delivery dates, and SKU breakdowns.
* **Gemini 2.5 Flash Integration:** Synthesizes multi-factor retail rationales explaining why the replenishment check triggered and which constraints were applied.
* **Graceful Offline Fallback:** Reverts automatically to structured rule templates if the LLM provider is unreachable.

### 2.4 RoutingAgent (Policy Tiering & Risk Classification)
* **Deterministic Risk Classifier:**
  * `HIGH RISK`: Any check status is `FAIL`, or supplier is unapproved, or total value exceeds $2 \times \text{Store Manager Limit}$.
  * `MEDIUM RISK`: Any check status is `FLAG`.
  * `LOW RISK`: All checks pass with approved vendor status.
* **Governance Routing Matrix:**
  * **Tier 1 (Auto-Approve):** Total value $\le \text{\rupee}10,000$, approved supplier, all checks `PASS`. Directly executed to ERP without human delay.
  * **Tier 2 (Store Manager Approval):** Total value between $\text{\rupee}10,001$ and $\text{\rupee}50,000$. Assigned to the local store manager (e.g., Priya Sharma for Store 214).
  * **Tier 3 (Regional Director Escalation):** Total value $> \text{\rupee}50,000$, or any check `FAIL`, or `HIGH RISK`. Escalated to Regional Procurement Director (Anita Deshmukh).

### 2.5 ExecutionAgent (Enterprise ERP & Dispatch)
* **Idempotent Ginesys ERP PO Write:** Writes confirmed purchase orders to the `purchase_orders` table using unique action UUIDs as idempotency keys.
* **Vendor Email Dispatch:** Records outbound supplier dispatches in `sent_emails` and transitions the workflow run status to `completed`.

---

## 3. High-Impact V-Mart Retail Innovations

### 3.1 Warehouse-First Distribution Center (DC) Allocation (`WH-NORTH-01`)
* **Problem Solved:** Raising fresh vendor purchase orders when V-Mart's own central distribution center (`WH-NORTH-01`) holds stock wastes working capital and strains store OTB budgets.
* **Mechanism:** Queries `warehouse_stock` for low-cover SKUs. Computes how many units can be fulfilled via an internal DC stock transfer ($2$-day transit, \rupee$0$ external vendor spend).
* **Impact:** Displays available DC units and estimated OTB budget savings directly on the Decision Card.

### 3.2 Inter-Store Lateral Stock Transfer Recommender
* **Problem Solved:** Prevents end-of-season apparel markdowns by identifying surplus inventory in peer stores within the same regional cluster.
* **Mechanism:** Scans `store_stock` across peer stores for identical SKUs where stock cover exceeds healthy thresholds ($> 7$ days).
* **Impact:** Surfaces an **Inter-Store Lateral Rebalance** badge detailing surplus units available from neighboring stores before committing to vendor MOQs.

### 3.3 Imminent Stockout-Gap Alert & Lost Revenue Estimator
* **Problem Solved:** Quantifies the commercial cost of delivery delays when vendor lead times exceed remaining shelf stock cover.
* **Mechanism:** Calculates unserved demand days:
  $$\text{Stockout Gap Days} = \max(0, \text{Lead Time Days} - \text{Days of Cover})$$
  Estimates potential lost retail sales revenue:
  $$\text{Lost Revenue At Risk} = \sum (\text{Stockout Gap Days} \times \text{Sales Velocity}_{\text{7d}} \times \text{Unit Cost} \times 1.4)$$
* **Impact:** Displays a prominent high-risk stockout alert on the Decision Card to justify expedited freight or emergency DC split dispatches.

### 3.4 Interactive Line-Item Quantity Override & Live Simulator
* **Problem Solved:** Store managers reviewing orders that slightly exceed remaining budget headroom need flexibility to trim non-critical SKUs rather than issuing an outright rejection.
* **Mechanism:** Provides an interactive quantity stepper within the Decision Card that adjusts SKU quantities in pack-size multiples.
* **Impact:** Dynamically recalculates the order total in real time, displays budget delta savings, submits modified line items upon approval, and logs an `approval_quantity_overridden` audit event.

### 3.5 Cryptographic SHA-256 Audit Trail Integrity Verifier
* **Problem Solved:** Provides mathematical, tamper-evident proof that no audit logs have been altered or deleted.
* **Mechanism:** Evaluates a deterministic SHA-256 hash chain across all historical audit records:
  $$H_i = \text{SHA-256}(H_{i-1} \mathbin{\Vert} \text{event\_id} \mathbin{\Vert} \text{run\_id} \mathbin{\Vert} \text{event\_type} \mathbin{\Vert} \text{actor\_id} \mathbin{\Vert} \text{created\_at} \mathbin{\Vert} \text{payload})$$
  Inspects PostgreSQL system catalogs (`pg_trigger`) to verify that the immutable database triggers (`trg_audit_no_update`, `trg_audit_no_delete`) are actively enforced.
* **Impact:** "Verify Cryptographic Integrity" button on the Audit page renders a live tamper-proof verification certificate with the root SHA-256 digest anchor.

---

## 4. AI Guardrails & Reliability Architecture

### 4.1 Deterministic LLM Numeric Hallucination Guard
* **Regex Extraction:** Programmatically extracts every numeric token from LLM-generated rationale strings using `\b\d+(?:,\d+)*(?:\.\d+)?\b`.
* **Authorized Evidence Whitelist:** Normalizes extracted numbers (stripping commas and leading zeros) and checks each against authorized context values (line quantities, unit costs, budget figures, cover days).
* **Automatic Fallback:** If any unauthorized number is detected, the platform automatically rejects the text, logs a warning, falls back to a deterministic template, and sets `"hallucination_guard_passed": false`.
* **UI Badge:** A green verification badge ("Verified: 0 Hallucinated Numbers") confirms deterministic verification on every Decision Card.

### 4.2 Multi-Key Gemini Pool with Automatic Failover
* Maintains a rotating pool of Gemini API keys.
* Automatically catches HTTP 429 (rate limits) and quota errors, failing over to alternative keys with zero end-user impact.
* Dynamically resolves model aliases (`gemini-2.5-flash`, `gemini-1.5-flash`).

---

## 5. Governance, Authorization & Policy Learning Engine

### 5.1 Role Hierarchy & Store-Scoped Authorization
* **Role Rank Hierarchy:** Regional Managers can decide both Store Manager and Regional tier requests; Store Managers cannot decide Regional tier orders.
* **Store-Level Authorization Check:** Store Managers are strictly scoped to their assigned `store_id` (e.g., Priya Sharma can only approve Store 214 orders; attempts to approve Store 087 or 312 return `403 Forbidden`).
* **Active Status Verification:** Checks that approvers are active in the system, preventing deactivated personnel from authorizing expenditures.

### 5.2 Rejection-to-Policy Adaptive Learning Engine (`FuturePage.tsx`)
* **Mandatory Justification:** Rejections require an audit reason of at least 20 characters.
* **Heuristic Analysis:** Analyzes human rejection feedback for key operational signals (budget constraints, excessive lead times, pack sizing).
* **Policy Suggestions:** Generates structured adaptation proposals stored in `policy_suggestions`.
* **One-Click Adoption:** Administrators can inspect suggestions on the Policy page and click **"Adopt Suggested Threshold"** to update live runtime governance limits (`ACTIVE_RULES`).

### 5.3 Immutable Append-Only Audit Trail
* Backed by PostgreSQL trigger functions that raise exceptions on any `UPDATE` or `DELETE` statement against `audit_events`.
* Every agent state transition, check result, human decision, and quantity adjustment is logged permanently.

---

## 6. Frontend Interface & Interactive Capabilities

### 6.1 Store Trigger Desk & Interactive "What-If" Sandbox (`HomePage.tsx`)
* **One-Click Scenarios:** Pre-configured triggers for Lucknow (`STORE-214`, Hero scenario), Jaipur (`STORE-087`, Auto-approve), and Patna (`STORE-312`, Escalation).
* **Live What-If Sandbox:** Expandable control panel featuring real-time sliders for store monthly budget spent. Allows presenters to slide budget from \rupee$30,000$ to \rupee$95,000$ to demonstrate live policy tier escalation.
* **Quick Presets:** One-click buttons to force budget violations or restore default database seeds.

### 6.2 Filterable Workflow Runs View (`WorkflowRunsPage.tsx`)
* Dedicated navigation tab providing an exhaustive historical ledger of all workflow executions.
* Filterable by store (`All`, `STORE-087`, `STORE-214`, `STORE-312`) and workflow status (`running`, `awaiting_approval`, `completed`, `rejected`, `failed`).
* Search bar supporting Run ID, Correlation ID, and store queries.
* Full pagination ($10$ runs per page), live KPI summary cards, and latency metrics (`agent_prep_ms`, `approval_wait_ms`).

### 6.3 Interactive Decision Card (`DecisionCard.tsx`)
* **Dual-Action Tabs:** Toggle between Ginesys PO line items and pre-drafted outbound vendor notification emails.
* **Interactive Quantity Override:** In-line plus/minus controls to step order quantities in pack-size multiples.
* **Innovation Badges:** Color-coded alert banners for stockout gap revenue risk, central DC allocation savings, and peer store surplus.
* **Persona Context:** Displays current acting persona, role authority status, and approval controls.

### 6.4 Multi-Supplier Purchase Order Switcher
* When a replenishment run generates orders across multiple suppliers (e.g., Arvind Textile and Welspun India), clean vendor tabs on `RunDetailPage.tsx` and `ApprovalDetailPage.tsx` allow independent inspection of each supplier's draft, checks, and email.

### 6.5 Live 5-Stage Agentic Pipeline Stepper (`PipelineStepper.tsx`)
* Visual status indicator rendered at the top of detail pages tracking all five execution stages:
  1. `Signal Detection` (Inventory cover scan)
  2. `Deterministic Checks` (MOQ, budget, lead time, DC allocation)
  3. `Cognitive Drafting` (Gemini 2.5 Flash + Hallucination Guard)
  4. `Governance Routing` (Policy tiering + Temporal HITL signal gate)
  5. `Enterprise Execution` (Ginesys ERP write + vendor email dispatch)
* Features real-time state styling (Completed green checkmark, Active amber pulse, Pending slate dot).

### 6.6 Persona Switcher
* Header persona selector supporting immediate switching between:
  * **Priya Sharma** (Store Manager, `STORE-214` Lucknow Gomtinagar)
  * **Rakesh Verma** (Store Manager, `STORE-087` Jaipur Vaishali)
  * **Anita Deshmukh** (Regional Procurement Manager, All Stores)

### 6.7 Operational Analytics Dashboard (`DashboardPage.tsx`)
* Real-time metrics showing total replenishment runs, pending approval queues, approved orders, rejections, and auto-approval rates.
* Quantified efficiency comparison contrasting Veyronica's sub-second automated preparation latency against manual retail baselines ($6\text{--}10$ minutes per PO).

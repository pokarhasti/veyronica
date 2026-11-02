# Veyronica — Comprehensive Codebase Audit, Bug Report & V-Mart Feature Roadmap

**Target Problem Statement:** Problem Statement No. 1 — *Agentic AI for Autonomous Business Process Automation* (`Software + AI/ML + Cloud Computing + Data Analytics`)  
**Target Enterprise:** V-Mart Retail Ltd. ($497$ stores across $27$ states, Tier-II/III/IV cities, operating on **Ginesys ERP** and **Supplymint DigiProc**)  
**Core Architectural Principle:** *"Code decides, AI explains"* — Deterministic Python rules govern financial/operational constraints and routing tiers, Temporal enforces durable Human-in-the-Loop (HITL) execution, and Gemini 2.5 Flash is strictly isolated to evidence-verified explanations and vendor email generation.

---

## 1. Critical Bugs in `Veyronica.zip` (Must Fix Before Live Demo)

These are actual technical defects found in your current codebase that will either crash the React frontend, silently drop supplier orders, or report false metrics during a live judge evaluation.

### Bug 1.1: Nested JSONB Serialization Crash in `draft_activity`
* **Location:** `backend/app/temporal/activities.py` (Lines 130–145) & `frontend/src/components/DecisionCard.tsx`
* **Root Cause:** When inserting into `action_drafts`, `draft_activity` serializes `check_results` and `numeric_evidence` using Pydantic's `model_dump_json(include=...)` on the parent `ActionDraft` model:
  ```python
  draft.model_dump_json(include={"check_results"}),
  draft.model_dump_json(include={"numeric_evidence"}),
  ```
  Because `model_dump_json(include={"check_results"})` is called on `ActionDraft`, Pydantic outputs a **JSON object** `{"check_results": [...]}` rather than a **JSON array** `[...]`.
* **Impact:** When `GET /api/approvals/{id}` returns `check_results` from PostgreSQL `JSONB`, the frontend receives an object instead of an array. Calling `approval.check_results.map(...)` in `DecisionCard.tsx` throws a fatal runtime error: `TypeError: approval.check_results.map is not a function`, crashing the entire Approval Detail screen.
* **Exact Fix:** Serialize the inner list and dictionary directly:
  ```python
  json.dumps([c.model_dump(mode="json") for c in draft.check_results]),
  draft.numeric_evidence.model_dump_json(),
  ```

---

### Bug 1.2: Broken `agent_prep_ms` Elapsed Time Calculation in PostgreSQL
* **Location:** `backend/app/temporal/activities.py` (Line 176) & `backend/app/agents/execution_agent.py` (Line 91)
* **Root Cause:** Both files calculate the agent preparation latency (`agent_prep_ms`) using:
  ```sql
  EXTRACT(MILLISECONDS FROM (NOW() - started_at))::INT
  ```
  In PostgreSQL, `EXTRACT(MILLISECONDS FROM interval)` returns **only the seconds and fractional seconds component** (i.e., $\text{seconds} \times 1000 + \text{ms}$, modulo $60,000$), or in some contexts only the sub-second fraction ($0$ to $999\text{ ms}$), completely discarding full minutes elapsed.
* **Impact:** The Dashboard KPI card **"Avg Agent Prep Time"** (`DashboardPage.tsx`) displays inaccurate or negative/wrapped millisecond values if a workflow takes longer than $60$ seconds or retries an activity.
* **Exact Fix:** Use `EXTRACT(EPOCH FROM ...)` multiplied by $1000$:
  ```sql
  (EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)::INT
  ```

---

### Bug 1.3: Single-Draft Bottleneck (`drafts[0]`) Silently Drops Multi-Supplier Orders
* **Location:** `backend/app/temporal/workflows.py` (Lines 35–85) & `backend/app/temporal/activities.py` (`route_activity`, `create_approval_activity`, `execute_activity`)
* **Root Cause:**
  1. `SignalAgent` scans all low-stock SKUs for a store and groups them by `supplier_id` into multiple `OrderGroup` objects.
  2. For `STORE-312` (Patna Boring Road) and `STORE-087` (Lucknow Gomtinagar), low-stock SKUs span up to **$4$ distinct suppliers** (`SUP-01` Arvind, `SUP-02` Welspun, `SUP-03` Page Industries, `SUP-04` Rupa).
  3. `DraftAgent` properly creates a list of `ActionDraft` objects—one per supplier.
  4. **The Bug:** `route_activity` only inspects `drafts[0]`:
     ```python
     draft = drafts[0]
     ```
     Similarly, `create_approval_activity` only creates an `approvals` row for `drafts[0]`, and `execute_activity` only executes `drafts[0]`.
* **Impact:** Whenever a store needs replenishment from multiple vendors, $75\%$ of the generated `action_drafts` are orphaned in the database in `status = 'draft'` and never routed, approved, or executed!
* **Exact Fix:**
  * Either aggregate routing across all supplier drafts in a run (creating per-draft approval items or a consolidated multi-PO approval bundle) **or** iterate through all `drafts` in `route_activity`, `create_approval_activity`, and `execute_activity` so every supplier PO in the run is governed and executed.

---

### Bug 1.4: Missing Store-Level Approver Authorization Check
* **Location:** `backend/app/api/approvals.py` (Lines 55–85)
* **Root Cause:** `decide_approval` validates three things:
  1. Whether the approver is active (`STORE-312` Rajesh Kumar deactivated check).
  2. Role hierarchy (`ROLE_RANK[approver["role"]] < ROLE_RANK[required_role]`).
  3. Financial authority limit (`approver["max_approval_inr"] < order_total`).
  However, it **never checks `approver["store_id"] == run["store_id"]`** when `required_role == "store_manager"`.
* **Impact:** Rakesh Verma (`APR-01`, Store Manager assigned to `STORE-087` Lucknow) can legally approve a Store Manager-tier order for `STORE-214` (Jaipur) without triggering a `403 Forbidden` error.
* **Exact Fix:** Enforce store matching for store-scoped roles (`store_manager`), while allowing regional/head-office roles (`regional_director`, `cfo` where `store_id IS NULL`) to approve across all stores:
  ```python
  if approver["store_id"] is not None and approver["store_id"] != approval["store_id"]:
      raise HTTPException(
          status_code=403,
          detail=f"Approver {approver['name']} is scoped to {approver['store_id']} and cannot approve orders for {approval['store_id']}."
      )
  ```

---

### Bug 1.5: Store Location Name Mismatch Between Frontend and Database
* **Location:** `frontend/src/pages/HomePage.tsx` (Lines 9–13) vs. `scripts/seed.py` (Lines 35–39)
* **Root Cause:**
  * `scripts/seed.py` seeds the database with:
    * `STORE-087`: **Lucknow Gomtinagar**
    * `STORE-214`: **Jaipur Vaishali**
    * `STORE-312`: **Patna Boring Road**
  * `HomePage.tsx` hardcodes:
    * `STORE-087`: **V-Mart New Delhi**
    * `STORE-214`: **V-Mart Patna**
    * `STORE-312`: **V-Mart Varanasi**
* **Impact:** On the Home screen, clicking `STORE-214` says "V-Mart Patna", while the LLM rationale and database records refer to "Jaipur Vaishali", and `STORE-312` says "V-Mart Varanasi" while the database says "Patna Boring Road". Judges will immediately spot this inconsistency.
* **Exact Fix:** Fetch store metadata dynamically from `/api/adapters/inventory/{store_id}` or align `STORE_NAMES` in `HomePage.tsx` with the database seed (`Lucknow Gomtinagar`, `Jaipur Vaishali`, `Patna Boring Road`).

---

### Bug 1.6: Dead LangGraph Code (`workflow_graph.py` Never Invoked)
* **Location:** `backend/app/graph/workflow_graph.py` & `backend/app/graph/state.py`
* **Root Cause:** `create_replenishment_graph()` builds a LangGraph `StateGraph(ReplenishmentState)` with 5 nodes (`signal`, `constraint`, `draft`, `route`, `execute`), and `README.md` / `project.md` claim the system uses **LangGraph + Temporal**. However, `workflow_graph.py` is never imported or called anywhere in `backend/app/temporal/` or `backend/app/api/`.
* **Impact:** If a technical judge inspects your repo and asks *"Where is LangGraph actually executed?"*, they will see it is dead code.
* **Exact Fix:** Wire the LangGraph state transitions into the agent orchestration pipeline (or expose a `/api/workflows/graph-topology` endpoint and execute the pre-approval cognitive subgraph `signal -> constraint -> draft -> route` inside the Temporal workflow/activities) so LangGraph actively drives agent state transitions while Temporal manages durability and the HITL signal pause.

---

### Bug 1.7: "Workflow Runs" Navigation Tab Just Renders `HomePage`
* **Location:** `frontend/src/App.tsx` (Lines 38–42)
* **Root Cause:** Both `activeTab === 'home'` and `activeTab === 'runs'` render `<HomePage />`, which slices the runs list to `.slice(0, 5)` and shows the 3 store trigger cards at the top.
* **Impact:** Clicking "Workflow Runs" in the top navigation bar appears to do nothing when the user is already on the Home page, and users cannot view older runs beyond the latest 5.
* **Exact Fix:** Create a dedicated `WorkflowRunsPage.tsx` component (or pass a mode prop) with store filters, status badges (`completed`, `awaiting_approval`, `rejected`, `running`), tier filters (`T1`, `T2`, `T3`), and full pagination.

---

## 2. Incomplete Features From Your `project.md` Specification

These features are explicitly promised in your `project.md` or partially scaffolded in your backend, but the wiring was left unfinished.

### Feature 2.1: Gated Supplier Email Draft & Preview (`send_supplier_email`)
* **Current State:**
  * `domain.py` defines `ActionType.SEND_SUPPLIER_EMAIL = "send_supplier_email"`.
  * `LLMClient.generate_supplier_email()` is fully implemented in `backend/app/llm/client.py`.
  * `ExecutionAgent` calls `generate_supplier_email()` *after* approval to send the email.
  * **What's Missing:** `DraftAgent` never generates a draft preview of the supplier notification email, and `DecisionCard.tsx` only shows the PO summary—not the outbound vendor email that will be dispatched upon approval.
* **What to Add:**
  * Have `DraftAgent` generate both the Ginesys PO payload and the drafted supplier email preview (subject, recipient email, body).
  * Add a **"Gated Actions Preview (2 Actions Queued: 1. Ginesys ERP PO Creation, 2. Supplier Dispatch Email)"** tab inside `DecisionCard.tsx` so the human approver can inspect the exact email text before clicking **Approve**.

---

### Feature 2.2: Deterministic LLM Numeric Hallucination Guard (Post-Check)
* **Current State:** Section 17 of `project.md` states:
  > *"Post-check (optional but clean): regex-extract all numbers from the returned string and verify each appears in `numeric_evidence` values. If any stray number appears, fall back to template."*
  Currently, `LLMClient.generate_rationale()` in `backend/app/llm/client.py` instructs Gemini not to invent numbers in the prompt, but performs **zero programmatic verification** on the returned text.
* **What to Add:**
  * Implement `_verify_no_hallucinated_numbers(text: str, evidence: NumericEvidence) -> bool` in `backend/app/llm/client.py`.
  * Extract all numeric tokens from the LLM response via regex, normalize formatting (commas, decimals), and verify every number matches an authorized number in `NumericEvidence` (or SKU IDs/store IDs/line counts).
  * If the LLM hallucinates even a single unauthorized number, log a warning, automatically fall back to `_template_rationale(evidence)`, and record `"hallucination_guard_triggered": true` in the audit metadata.
  * Display a **"Verified: 0 Hallucinated Numbers (Deterministic Guard Passed)"** badge next to the AI Rationale on `DecisionCard.tsx`.

---

### Feature 2.3: Unused Adapter Methods (`read_warehouse_stock` & `read_purchase_history`)
* **Current State:**
  * `InventoryAdapter.read_warehouse_stock(sku_ids)` queries the seeded `warehouse_stock` table (`WH-NORTH-01` holding $320$–$950$ units per SKU).
  * `ERPAdapter.read_purchase_history(store_id)` queries the last 20 historical POs from `purchase_orders`.
  * **Neither method is ever called by any agent or API endpoint.**
* **What to Add:**
  * Integrate `read_warehouse_stock()` into `ConstraintAgent` (see Feature 3.1 below) to check central warehouse availability alongside external vendor procurement.
  * Integrate `read_purchase_history()` into `SignalAgent` / `ConstraintAgent` to detect duplicate recent POs (in-transit inventory check) and display historical store PO velocity on the Decision Card.

---

### Feature 2.4: Executed PO & Sent Email Confirmation Card on `RunDetailPage.tsx`
* **Current State:** When a run finishes (`status = 'completed'`), `ExecutionAgent` writes a new row to `purchase_orders` (e.g., `PO-20260320-A1B2C3`) and `sent_emails`, and stores `po_id` in `action_drafts.executed_reference_id`. However, `GET /api/runs/{run_id}` never queries `purchase_orders` or `sent_emails`, and `RunDetailPage.tsx` only displays the pre-execution draft!
* **What to Add:**
  * Enrich `GET /api/runs/{run_id}` to return the created `purchase_orders` record(s) and `sent_emails` record(s) linked to the run.
  * Add an **"Executed Enterprise Actions (Ginesys ERP & Supplier Dispatch)"** section at the bottom of `RunDetailPage.tsx` showing:
    * Official Ginesys PO Number (`executed_reference_id`), timestamp, line items, and `confirmed` status.
    * Dispatched Supplier Email card showing `to_address`, `subject`, `body`, and `sent_at` timestamp.

---

### Feature 2.5: Turn `FuturePage.tsx` ("Stretch Goals") into a Working Rejection-to-Policy Learning Loop
* **Current State:** `FuturePage.tsx` is a static text page listing future ideas. Meanwhile, Section 11 of `project.md` describes a 30-line stretch feature:
  > *"When a human rejects an approval and enters a reason, a lightweight helper reads the rejection reason alongside the run's `numeric_evidence` and writes a structured row to a `policy_suggestions` table."*
* **What to Add:**
  * Add the `policy_suggestions` table and trigger deterministic/LLM policy analysis whenever an approver clicks **Reject** on an approval.
  * Replace the static `FuturePage.tsx` with a live **Policy Governance & Learning Engine** page where judges can see active routing thresholds (`T1 <= ₹25,000`, `T2 <= ₹1,50,000`, `T3 > ₹1,50,000`), inspect policy suggestions generated from past human rejections, and click **"Apply Suggested Threshold"** to dynamically tune governance rules.

---

## 3. High-Impact V-Mart Innovations (How to Beat Blinkit, DigiProc & SAP)

The prompt requires differentiating your solution from **Blinkit** (quick-commerce) and existing retail tools (**Supplymint DigiProc**, **Ginesys ERP**) specifically for **V-Mart's** operational model.

### Why Blinkit's Model Fails for V-Mart (And What V-Mart Actually Needs)
* **Blinkit / Zepto (Quick-Commerce):** Operates $1,800+$ urban dark stores ($2\text{--}3\text{ km}$ radius) selling high-frequency groceries with $10$-minute delivery and intra-day micro-warehouse replenishment. Lead times are measured in hours, pack sizes are small, and working capital is velocity-driven.
* **V-Mart Retail ($497$ Stores in Tier-II/III/IV Cities):** Sells value fashion, apparel (`Apparel-Men`, `Apparel-Women`, `Apparel-Kids`, `Innerwear`), and home textiles (`Home-Textiles`) with seasonal demand, **$5\text{--}10\text{ day}$ regional supplier lead times**, strict vendor **Minimum Order Quantities (MOQ)** and **case-pack multiples (`pack_size`)**, strict monthly store **Open-to-Buy (OTB) budgets**, and a **hub-and-spoke central warehouse (`WH-NORTH-01`)**.
* **Supplymint DigiProc (V-Mart's Current Tool):** Digitizes manual PO form entry ($6\text{--}10\text{ min} \rightarrow 1\text{ min}$), but relies on human buyers to manually check warehouse stock, calculate case packs, check store OTB budgets, check vendor credit limits, and chase managers on WhatsApp/email for approval.

Here are the **5 V-Mart-specific innovations** to implement directly into your project:

---

### Innovation 3.1: Warehouse-First Allocation Engine (DC vs. External Vendor Split)
* **Business Problem Solved:** In V-Mart, raising an external vendor PO when V-Mart's own central warehouse (`WH-NORTH-01`) already holds inventory wastes working capital, consumes the store's monthly OTB budget, and locks cash into vendor MOQs.
* **How It Works:**
  1. During `ConstraintAgent.run()`, query `InventoryAdapter.read_warehouse_stock(sku_ids)` for the low-stock SKUs.
  2. Calculate how much of the store's deficit can be fulfilled via an **Internal DC Stock Transfer** from `WH-NORTH-01` ($2$-day internal transit, ₹$0$ external vendor spend) vs. **External Supplier PO**.
  3. Include warehouse stock metrics (`warehouse_available_qty`, `recommended_dc_transfer_qty`) in `check_results` and `numeric_evidence` so the manager sees whether central warehouse stock is available before approving external vendor spend.

---

### Innovation 3.2: Inter-Store Lateral Stock Transfer Recommender (Tier-II/III Cluster Optimization)
* **Business Problem Solved:** In apparel retail, `STORE-087` (Lucknow) might be stocking out of *Men's Cotton Crew T-Shirt (`SKU-1001`)* ($0.5\text{ days}$ cover), while another store has slow-moving stock sitting unsold ($>10\text{ days}$ cover). Ordering fresh vendor MOQ leads to end-of-season markdowns.
* **How It Works:**
  1. Add a deterministic check in `InventoryAdapter` / `ConstraintAgent` that scans peer V-Mart stores (`store_inventory`) for the same `sku_id` where peer `days_of_cover` exceeds a healthy buffer (e.g., $>7\text{ days}$) and surplus units exist above reorder point.
  2. Surface an **Inter-Store Transfer Opportunity** badge on the Decision Card showing which peer store holds transferable units, saving external procurement spend.

---

### Innovation 3.3: Imminent Stockout-Gap Alert & Expedite Recommender
* **Business Problem Solved:** Your `backend/app/checks/lead_time.py` already calculates:
  $$\text{stockout\_gap\_days} = \text{round}(\text{lead\_time\_days} - \text{min\_cover\_days}, 1)$$
  For `STORE-087` (`SKU-1001`), `current_stock` is $8\text{ units}$ and `velocity_7d` is $14.5\text{ units/day}$, giving $\text{min\_cover\_days} = 0.6\text{ days}$, whereas Arvind Textile (`SUP-01`) has a `lead_time_days` of $5\text{ days}$. That means the store will be **completely out of stock for $4.4\text{ days}$** before the shipment arrives!
* **How It Works:**
  * Currently, `DecisionCard.tsx` ignores `stockout_gap_days` in `check_results`.
  * Upgrade `DecisionCard.tsx` and `ConstraintAgent` to highlight the **Stockout Window ($4.4\text{ days}$ unserved demand)**, calculate estimated **Lost Sales Revenue avoided** ($\text{stockout\_gap\_days} \times \text{velocity\_7d} \times \text{unit\_cost\_inr} \times 1.4\text{ retail margin}$), and recommend an emergency DC split dispatch when $\text{stockout\_gap\_days} > 0$.

---

### Innovation 3.4: Interactive Line-Item Quantity Override & Live Constraint Simulator on Decision Card
* **Business Problem Solved:** In real retail operations, when a Regional Director (`APR-02` Priya Nair) reviews a ₹$1,18,000$ Tier-2 order or a store manager reviews an order that exceeds the store's remaining monthly OTB budget (like `STORE-214`, where remaining budget is ₹$30,000$ and order cost is ₹$42,000$), they shouldn't just have a binary "Approve" or "Reject" button. They often want to **trim non-critical SKU quantities** to fit within the ₹$30,000$ budget!
* **How It Works:**
  * Add an **"Adjust Order Quantities"** mode inside `DecisionCard.tsx` (for pending approvals) that lets the approver step SKU quantities up/down in `pack_size` multiples.
  * Instantly recalculate:
    1. Updated Order Total (₹)
    2. MOQ Compliance Check (`PASS` / `FAIL` against `moq_units` and `moq_value_inr`)
    3. Store OTB Budget Headroom Check (`PASS` / `FAIL` against `remaining_budget_inr`)
  * Pass the modified quantities (or override flag) to `POST /api/approvals/{id}/decide` so the approved PO reflects the manager's exact adjustment and records the delta in `audit_log`.

---

### Innovation 3.5: Cryptographic SHA-256 Hash-Chain Verification on the Immutable Audit Trail
* **Business Problem Solved:** The hackathon problem statement emphasizes *"dashboards and audit trails that record every action, decision, and outcome of the agent"* to ensure enterprise trust and accountability.
* **Current State:** `001_initial.sql` has a great PostgreSQL trigger (`audit_log_immutable`) that blocks `UPDATE` and `DELETE` with SQLSTATE `23001`.
* **How It Works:**
  * Add a `GET /api/audit/verify-integrity` endpoint that computes a deterministic SHA-256 hash chain across all `audit_log` rows ordered by `id` (`hash_i = SHA256(prev_hash + id + run_id + actor + action + timestamp + payload)`), plus verifies that the PostgreSQL immutability trigger `trg_audit_immutable` is active in `pg_trigger`.
  * Add a **"Verify Audit Tamper-Proof Integrity"** button on `AuditTrailPage.tsx` that runs the cryptographic & DB trigger verification live in front of the judges and displays a green verification certificate with the root SHA-256 digest.

---

## 4. UI/UX & Live Hackathon Demo Enhancements

### Enhancement 4.1: Interactive "What-If" Store Inventory & Budget Simulator (`HomePage.tsx`)
* **Why Judges Love It:** Hackathon judges always test whether a project is hardcoded to $3$ pre-baked buttons or actually runs dynamic agentic reasoning.
* **What to Add:**
  * Add an expandable **"Live ERP & Inventory Sandbox"** panel on `HomePage.tsx` (backed by a new `PUT /api/admin/simulate-store-state` endpoint).
  * Allow the presenter or judge to adjust:
    * Store Monthly Budget Spent (`budget_spent_inr`) via a slider (e.g., slide `STORE-087` budget from ₹$3,10,000$ to ₹$4,95,000$ to force a budget violation -> automatic escalation to Tier 2!).
    * SKU Current Stock or 7-Day Sales Velocity (`velocity_7d`) to dynamically push an order below ₹$25,000$ (Tier 1 Auto-Execute) or above ₹$1,50,000$ (Tier 3 CFO Approval).
    * Toggle Rajesh Kumar (`APR-04`) Active/Deactivated status to test the deactivated approver fallback live.

---

### Enhancement 4.2: Multi-Supplier PO Switcher on `ApprovalDetailPage.tsx` & `RunDetailPage.tsx`
* Once Bug 1.3 is fixed so all supplier drafts in a run are preserved, display a clean **Supplier PO Tabs** bar (`SUP-01 Arvind Textile`, `SUP-02 Welspun India`, `SUP-03 Page Industries`, `SUP-04 Rupa & Co`) on `RunDetailPage.tsx` and `ApprovalDetailPage.tsx` so the user can inspect each vendor's MOQ, credit limit, lead time, and generated PO independently.

---

### Enhancement 4.3: Architecture & LangGraph + Temporal Live State Visualizer
* Add a visual **5-Stage Agentic Pipeline Stepper** (`1. SignalAgent (Inventory Scan) -> 2. ConstraintAgent (MOQ/Budget/Credit/LeadTime) -> 3. DraftAgent (Gemini 2.5 Flash + Numeric Guard) -> 4. RoutingAgent (Policy Tiering + Temporal HITL Signal) -> 5. ExecutionAgent (Ginesys ERP + Supplier Email)`) at the top of `RunDetailPage.tsx` and `ApprovalDetailPage.tsx`, showing real-time progress and which node is currently active or paused.

---

## 5. Summary Checklist: Priority Order of Implementation

| Priority | Category | Item | Target Files |
| :--- | :--- | :--- | :--- |
| **P0 (Blocker)** | Bug Fix | Fix nested `JSONB` serialization of `check_results` and `numeric_evidence` | `backend/app/temporal/activities.py` |
| **P0 (Blocker)** | Bug Fix | Fix `EXTRACT(EPOCH FROM ...)` millisecond calculation for `agent_prep_ms` | `backend/app/temporal/activities.py`, `backend/app/agents/execution_agent.py` |
| **P0 (Blocker)** | Bug Fix | Fix store location name mismatch (`Lucknow`, `Jaipur`, `Patna`) | `frontend/src/pages/HomePage.tsx` |
| **P0 (Blocker)** | Bug Fix | Enforce store-level approver scoping (`approver.store_id == run.store_id`) | `backend/app/api/approvals.py` |
| **P1 (Core Spec)** | Feature | Multi-supplier draft handling (`drafts` loop instead of `drafts[0]` only) | `backend/app/temporal/workflows.py`, `backend/app/temporal/activities.py` |
| **P1 (Core Spec)** | Feature | Deterministic LLM Numeric Hallucination Guard post-check | `backend/app/llm/client.py` |
| **P1 (Core Spec)** | Feature | Gated Supplier Email draft preview (`send_supplier_email`) in Decision Card | `backend/app/agents/draft_agent.py`, `frontend/src/components/DecisionCard.tsx` |
| **P1 (Core Spec)** | Feature | Executed Ginesys PO & Sent Email confirmation viewer on Run Detail | `backend/app/api/runs.py`, `frontend/src/pages/RunDetailPage.tsx` |
| **P1 (Core Spec)** | Feature | Dedicated filterable Workflow Runs view & active LangGraph integration | `frontend/src/App.tsx`, `backend/app/graph/workflow_graph.py` |
| **P2 (V-Mart Edge)** | Innovation | Warehouse-First Allocation (`WH-NORTH-01`) & Peer Store Lateral Transfer check | `backend/app/agents/constraint_agent.py`, `backend/app/adapters/inventory_adapter.py` |
| **P2 (V-Mart Edge)** | Innovation | Stockout-Gap Lost Revenue estimator & Interactive Line-Qty Override | `frontend/src/components/DecisionCard.tsx`, `backend/app/api/approvals.py` |
| **P2 (V-Mart Edge)** | Innovation | Cryptographic SHA-256 Audit Chain Integrity Verifier | `backend/app/api/audit.py`, `frontend/src/pages/AuditTrailPage.tsx` |
| **P2 (V-Mart Edge)** | Innovation | Live "What-If" Store Inventory & OTB Budget Simulator + Policy Learning Loop | `backend/app/api/admin.py`, `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/FuturePage.tsx` |
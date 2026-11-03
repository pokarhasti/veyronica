# Veyronica — Complete Demo & Usage Guide

> **V-Mart Governed Agentic Replenishment Platform**  
> *Deterministic Separation: Code decides, AI explains.*  
> **SIH 2026 Hackathon Demo Script**

---

## Table of Contents

1. [Prerequisites & Environment Setup](#1-prerequisites--environment-setup)
2. [Starting the Platform](#2-starting-the-platform)
3. [Verifying Everything is Running](#3-verifying-everything-is-running)
4. [Understanding the UI Layout](#4-understanding-the-ui-layout)
5. [Demo Scenario 1 — STORE-214: Hero Scenario (Store Manager Approval)](#5-demo-scenario-1--store-214-hero-scenario)
6. [Demo Scenario 2 — STORE-087: Auto-Approve (No Human Needed)](#6-demo-scenario-2--store-087-auto-approve)
7. [Demo Scenario 3 — STORE-312: Regional Manager Escalation](#7-demo-scenario-3--store-312-regional-manager-escalation)
8. [Exploring All UI Tabs](#8-exploring-all-ui-tabs)
9. [Interactive Sandbox: Budget Simulator](#9-interactive-sandbox-budget-simulator)
10. [Resetting Demo Data](#10-resetting-demo-data)
11. [Backend API Reference (Swagger)](#11-backend-api-reference-swagger)
12. [Running the Test Suite](#12-running-the-test-suite)
13. [Troubleshooting](#13-troubleshooting)
14. [Judge Q&A Preparation](#14-judge-qa-preparation)
15. [Architecture Quick Reference](#15-architecture-quick-reference)

---

## 1. Prerequisites & Environment Setup

### Software Required

| Software | Version | Purpose |
|----------|---------|---------|
| **Python** | 3.11+ | Backend (FastAPI + SQLAlchemy) |
| **Node.js** | 18+ | Frontend (React + Vite + TypeScript) |
| **npm** | 9+ | Frontend package manager |
| **Git** | Any | Clone/pull repo |

### Database (Already Configured)

The project uses a **Neon  ** cloud database — no local Postgres installation needed. The connection URL is pre-configured in the `.env` file.

### API Keys (Already Configured)

The `.env` file contains:
- **8 Gemini API keys** (auto-failover pool for LLM rationale generation)
- **1 Grok (xAI) key** (secondary fallback)
- **Plan C template fallback** (if all LLMs are offline, deterministic templates generate rationales — honestly labeled as `template`)

---

## 2. Starting the Platform

You need **two terminals** running simultaneously.

### Terminal 1 — Backend (FastAPI)

```powershell
cd "d:\Projects 2\Veyronica\backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**What you'll see on successful startup:**
```
🚀 Veyronica starting up...
✅ PostgreSQL connected & schema verified
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 — Frontend (Vite + React)

```powershell
cd "d:\Projects 2\Veyronica\frontend"
npm run dev -- --host 0.0.0.0 --port 5173
```

**What you'll see:**
```
VITE v6.x.x  ready in Xms

➜  Local:   http://localhost:5173/
➜  Network: http://0.0.0.0:5173/
```

### Access Points

| What | URL |
|------|-----|
| **Frontend UI** | http://localhost:5173 |
| **Backend API Docs (Swagger)** | http://localhost:8000/docs |
| **Backend Health Check** | http://localhost:8000/api/adapters/health |

---

## 3. Verifying Everything is Running

### Quick Health Check

Open http://localhost:8000/api/adapters/health in a browser. You should see:

```json
{
  "postgres": "ok",
  "temporal": "simulator",
  "worker": "simulator",
  "inventory_adapter": "ok",
  "erp_adapter": "ok",
  "supplier_adapter": "ok"
}
```

> **Note:** `temporal: "simulator"` is expected and correct. The platform uses a built-in durable execution simulator (equivalent to Temporal but doesn't require a separate Temporal server). All workflows execute with full durability guarantees.

### Frontend Health Indicator

Look at the **top-left corner** of the UI header. You should see:
- 🟢 **ENGINES CERTIFIED** — Everything is connected
- 🟡 **SERVICES RECONCILING** — Some services initializing (wait a few seconds)

---

## 4. Understanding the UI Layout

### Header Bar (Top of Page)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Health Indicator]        ARCHIVAL FOLIO § 2026-DISPATCH            │
│                                                                     │
│  ⚖ Veyronica LEDGER DESK    SIGNATORY: [Dropdown]  [🔄 Reset]     │
│                                                                     │
│  § 01 Replenishment Check  │ § 02 Approval Queue │ § 03 Runs │ ... │
└─────────────────────────────────────────────────────────────────────┘
```

| Element | Purpose |
|---------|---------|
| **SIGNATORY dropdown** | Switch between personas: *Priya Sharma (Store Manager)*, *Rakesh Verma (Store Manager)*, *Anita Deshmukh (Regional Manager)* |
| **🔄 Reset button** | Resets all demo data to original seed state |
| **6 navigation tabs** | Replenishment Check → Approval Queue → Workflow Runs → Audit Trail → Metrics Desk → Policy Learning |

### Store Selector (Homepage)

The dropdown `SELECT STORE:` has three pre-seeded demo stores:
- `STORE-214` — V-Mart Lucknow Gomtinagar (Hero Scenario)
- `STORE-087` — V-Mart Jaipur Vaishali (Auto-Approve)
- `STORE-312` — V-Mart Patna Boring Road (Regional Escalation)

---

## 5. Demo Scenario 1 — STORE-214: Hero Scenario

> **What this proves:** Full agentic pipeline → deterministic constraint checks → budget FLAG → Store Manager approval gate → ERP PO creation → supplier email dispatch

### Step-by-Step

#### Step 1: Select Store & Persona

1. Make sure `SIGNATORY` dropdown shows **Priya Sharma [STORE MANAGER]**
2. On the homepage (`§ 01 Replenishment Check`), select **STORE-214 (Lucknow Gomtinagar)** from the store dropdown

You'll see the scenario card:
> *"Hero Scenario — V-Mart Lucknow Gomtinagar (Store Manager Approval Gate)"*
> Stock cover drops below 5 days across 3 core apparel SKUs...

#### Step 2: Trigger Replenishment Check

1. Click the red **▶ ISSUE REPLENISHMENT DISPATCH** button
2. The system will automatically navigate to the **Run Detail Page**
3. Watch the **Pipeline Stepper** progress through stages:

```
Signal Detection → Constraint Checks → Draft Assembly → Routing → Awaiting Approval
```

Each step takes 1-3 seconds (real database operations + LLM call for rationale).

#### Step 3: Observe the Pipeline Results

On the Run Detail Page, you'll see multiple tabs:

**Decision Tab (default):**
- **"Code Decides, AI Explains"** side-by-side card showing:
  - **LEFT:** Deterministic constraint check results (PASS/FLAG/FAIL for each check)
  - **RIGHT:** LLM-generated human-readable rationale explaining why

- **Constraint Check Results:**
  - ✅ MOQ Check: **PASS** (order quantity meets minimums)
  - ✅ Lead Time Check: **PASS** (5-6 day delivery within 7-day limit)
  - ⚠️ Budget Headroom: **FLAG** (~70% headroom utilized)
  - ✅ Supplier Credit: **PASS** (sufficient credit available)
  - ✅ Supplier Approved: **PASS**

- **Routing Decision:** Routed to **Store Manager** (value ₹10,001–₹50,000 with FLAG)

**Signals Tab:**
- Shows 3 SKUs detected below 6-day reorder threshold:
  - SKU-8821 (Men's Slim Jeans): 24 stock, 6/day velocity → **4 days cover**
  - SKU-7732 (Women's Kurta Set): 12 stock, 3/day → **4 days cover**
  - SKU-9015 (Men's Cargo Trousers): 8 stock, 2/day → **4 days cover**

**Checks Tab:**
- Detailed breakdown of each deterministic check with exact values

**Audit Tab:**
- Real-time audit events with SHA-256 hashes

#### Step 4: Approve the Order

1. The Decision Card shows **Approve & Execute PO** and **Reject** buttons
2. *(Optional)* Adjust individual SKU quantities using the **line-item override sliders** (pack-size multiples only)
3. Click **Approve & Execute PO**

#### Step 5: Observe Post-Approval

After approval, the system automatically:
1. ✅ Creates a **Purchase Order** in the simulated Ginesys ERP (`purchase_orders` table)
2. ✅ Sends a **Supplier Notification Email** (recorded in `sent_emails` table)
3. ✅ Updates the run status to **COMPLETED**
4. ✅ Writes immutable `approval_decided`, `po_created`, `email_sent` audit events

The pipeline stepper updates to show all stages complete with green checkmarks.

---

## 6. Demo Scenario 2 — STORE-087: Auto-Approve

> **What this proves:** Orders below ₹10,000 from approved suppliers with all checks PASS are automatically executed without human intervention.

### Step-by-Step

#### Step 1: Reset Demo (if needed)

Click the **🔄 Reset** button in the header to restore clean seed data.

#### Step 2: Select Store

1. Navigate to `§ 01 Replenishment Check`
2. Select **STORE-087 (Jaipur Vaishali)** from the store dropdown
3. **Any persona** works — auto-approve bypasses human approval entirely

#### Step 3: Trigger

1. Click **▶ ISSUE REPLENISHMENT DISPATCH**
2. Watch the pipeline progress — it will go through all stages and skip the approval gate entirely:

```
Signal Detection → Constraint Checks → Draft Assembly → Routing → AUTO-APPROVED → PO Created → Email Sent → COMPLETED
```

#### Step 4: Observe

- **No approval pause** — the order auto-executes
- Only 1 SKU triggers (SKU-4410: Kids' Cotton T-Shirt, ₹120 unit cost, small quantity)
- Total value under ₹10,000 → **Rule 6: Auto-Approve**
- All checks PASS, approved supplier → no human needed
- Run status goes directly to **COMPLETED**

---

## 7. Demo Scenario 3 — STORE-312: Regional Manager Escalation

> **What this proves:** High-value orders or budget breach → automatic escalation to Regional Procurement Manager.

### Step-by-Step

#### Step 1: Reset Demo

Click the **🔄 Reset** button.

#### Step 2: Select Store & Persona

1. Select **STORE-312 (Patna Boring Road)** from the store dropdown
2. Switch `SIGNATORY` to **Anita Deshmukh [REGIONAL MANAGER]** (she's the only one authorized to approve this tier)

#### Step 3: Trigger

1. Click **▶ ISSUE REPLENISHMENT DISPATCH**
2. The pipeline will detect **many SKUs below threshold** (8-10 SKUs are low stock)
3. Budget: ₹70,000 spent of ₹80,000 → only ₹10,000 headroom remaining

#### Step 4: Observe the Escalation

- Multiple constraint checks will show **FLAG** or **FAIL**:
  - ❌ Budget Headroom: **FAIL** (order exceeds remaining ₹10,000)
  - ⚠️ Supplier Credit for some suppliers: **FLAG**
- **Routing:** Escalated to **Regional Procurement Manager** (Anita Deshmukh)
- **Risk Tier:** HIGH

#### Step 5: Approve or Reject

As Anita Deshmukh (Regional Manager), you can:
- **Approve** with optional line-item quantity overrides to bring order within budget
- **Reject** with a written reason (triggers policy learning suggestion)

#### Step 6: If Rejected — Policy Learning

After a rejection:
1. Navigate to **§ 06 Policy Learning** tab
2. The system generates an AI-powered **policy suggestion** based on the rejection
3. Example: *"Lower the auto-approve limit for stores with budget utilization > 85%"*
4. You can **Apply** or **Dismiss** the suggestion

---

## 8. Exploring All UI Tabs

### § 01 — Replenishment Check (Homepage)

- **Store selector** with 3 demo stores
- **Trigger button** to start a new replenishment check
- **Budget simulator sandbox** (expandable)
- **Recent runs** list at the bottom

### § 02 — Approval Queue

- Shows **pending approval requests** filtered by the current signatory's role
- Click any pending item to view full Decision Card and approve/reject
- Auto-refreshes every 4 seconds

### § 03 — Workflow Runs

- **Filterable list** of all past and active workflow runs
- Shows: Store ID, Status, Started At, Duration
- Click any run to see full detail page with Decision Card, Signals, Checks, Audit

### § 04 — Audit Trail

- **Filterable audit event log** (by run_id, event_type, actor_id)
- Each event shows:
  - Timestamp, Event Type, Actor, Payload
  - **SHA-256 hash** proving immutability
- **"Verify Cryptographic Integrity"** button:
  - Recomputes full SHA-256 chain across all audit events
  - Checks PostgreSQL triggers (`trg_audit_no_update`, `trg_audit_no_delete`) are active
  - Displays verification certificate with root hash

### § 05 — Metrics Desk (Dashboard)

- **Aggregate KPIs:**
  - Total runs, approval rate, average processing time
  - Auto-approve vs manual approve ratio
  - Orders by risk tier
- Visual charts (Recharts)

### § 06 — Policy Learning

- **Policy suggestions** generated from rejected orders
- Shows: Current Rule, Suggested Rule, Confidence Score, Rationale
- **Apply** or **Dismiss** each suggestion
- Demonstrates the platform's self-improvement loop

---

## 9. Interactive Sandbox: Budget Simulator

On the homepage (`§ 01`), click **"Open Balance Sheet Simulator"** (expandable section).

### What You Can Do

1. **Adjust budget spent** using the slider
   - Example: Increase STORE-214's budget_spent from ₹90,000 to ₹140,000
   - This leaves only ₹10,000 headroom → triggers FAIL on budget check
   - Next replenishment trigger will escalate to Regional Manager instead of Store Manager

2. **Reset** — Click "Restore to Certified Seed State" to reset budget values

### Why This Matters for Demo

This proves the system is **genuinely dynamic** — changing database values in real-time changes the routing behavior. Nothing is hardcoded.

---

## 10. Resetting Demo Data

### Method 1: UI Button (Recommended)

Click the **🔄 Reset** button in the top-right of the header.
- Clears all runs, signals, drafts, approvals, POs, and emails
- Re-seeds stores, SKUs, suppliers, approvers, and stock levels
- Page reloads automatically

### Method 2: API Call

```bash
curl -X POST http://localhost:8000/api/admin/reset-demo
```

### Method 3: Script

```powershell
cd "d:\Projects 2\Veyronica\backend"
python -m scripts.seed reset
```

### When to Reset

- **Before each major demo scenario** (especially if you ran a previous scenario that consumed budget)
- **If something looks wrong** — reset is always safe and instant

---

## 11. Backend API Reference (Swagger)

Open **http://localhost:8000/docs** for the interactive Swagger UI.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/workflows/replenishment/trigger` | Start a replenishment check for a store |
| `GET` | `/api/runs` | List all workflow runs (filterable) |
| `GET` | `/api/runs/{run_id}` | Get full run detail with signals, checks, drafts |
| `GET` | `/api/approvals/pending` | List pending approval requests |
| `POST` | `/api/approvals/{id}/approve` | Approve an order |
| `POST` | `/api/approvals/{id}/reject` | Reject an order |
| `GET` | `/api/audit` | List audit events (filterable) |
| `GET` | `/api/audit/verify-integrity` | Verify SHA-256 chain integrity |
| `GET` | `/api/dashboard/metrics` | Dashboard aggregate metrics |
| `GET` | `/api/approvers` | List all configured approvers |
| `GET` | `/api/adapters/health` | System health check |
| `GET` | `/api/policy/rules` | View active policy rules |
| `GET` | `/api/policy/suggestions` | View AI-generated policy suggestions |
| `POST` | `/api/admin/reset-demo` | Reset all demo data |
| `GET` | `/api/admin/store-state/{store_id}` | Get store budget & stock details |
| `PUT` | `/api/admin/simulate-store-state` | Modify store budget/stock for testing |
| `GET` | `/api/workflows/graph/topology` | Get LangGraph node topology |
| `POST` | `/api/workflows/graph/simulate` | Run LangGraph pipeline directly |

---

## 12. Running the Test Suite

```powershell
cd "d:\Projects 2\Veyronica"
pytest
```

### Expected Output

```
========================= test session starts =========================
collected 52 items

tests/test_agents.py ........                                    [ 15%]
tests/test_api_approvals.py ....                                 [ 23%]
tests/test_checks.py .......                                     [ 36%]
tests/test_db_url.py .......                                     [ 50%]
tests/test_innovations.py ..                                     [ 53%]
tests/test_llm_client.py ..........                              [ 73%]
tests/test_policy.py ........                                    [ 88%]
tests/test_temporal_simulation.py .                              [ 90%]
tests/test_workflow_graph.py ...                                 [ 96%]
========================= 52 passed =========================
```

### What Each Test File Covers

| Test File | What It Tests |
|-----------|---------------|
| `test_checks.py` | All 5 deterministic constraint checks (MOQ, lead time, budget, credit, supplier status) |
| `test_policy.py` | Routing policy matrix (auto-approve thresholds, store manager vs regional manager tiers) |
| `test_agents.py` | Agent order sizing, signal detection, pack-size rounding |
| `test_llm_client.py` | LLM failover chain (Gemini → Grok → Plan C template), timeout handling |
| `test_api_approvals.py` | Approval role hierarchy, rejection validation, duplicate approval protection |
| `test_db_url.py` | Database URL normalizer (Neon, local, sslmode, pooler host detection) |
| `test_innovations.py` | Warehouse DC allocation, inter-store lateral transfer |
| `test_temporal_simulation.py` | Durable execution simulator |
| `test_workflow_graph.py` | LangGraph node topology and state transitions |

---

## 13. Troubleshooting

### Problem: Backend won't start / "PostgreSQL connection failed"

**Cause:** Network/DNS issue reaching Neon database.

**Fix:**
1. Check internet connection
2. Verify `.env` file has `DATABASE_URL` set correctly
3. Try: `curl -I https://ep-shy-math-aovovn6d-pooler.c-2.ap-southeast-1.aws.neon.tech`

### Problem: Frontend shows "Request failed" errors

**Cause:** Backend is not running on port 8000.

**Fix:**
1. Ensure backend is running in Terminal 1
2. Check `VITE_API_BASE_URL=http://localhost:8000` in `.env`
3. Check browser console for CORS errors

### Problem: LLM rationale says "(template)" or "deterministic template"

**Cause:** All Gemini API keys exhausted free tier quota, Grok also unavailable.

**This is expected behavior — not a bug.** The system:
1. Tries all 8 Gemini keys in sequence
2. Falls back to Grok
3. Falls back to deterministic template (honestly labeled)

The deterministic constraint checks, routing, and order calculations are **unaffected** — only the AI-generated rationale text uses a template.

### Problem: "Temporal unreachable" in logs

**Expected.** The platform uses a built-in durable execution simulator equivalent. All workflows run correctly. The log message is informational.

### Problem: Approval button doesn't work / "Insufficient role"

**Cause:** Wrong persona selected in the `SIGNATORY` dropdown.

**Fix:**
- **STORE-214 orders** → Select **Priya Sharma [STORE MANAGER]**
- **STORE-312 orders** → Select **Anita Deshmukh [REGIONAL MANAGER]**
- **STORE-087 orders** → Auto-approved, no button needed

---

## 14. Judge Q&A Preparation

### "Is this actually using a database or is it mocked?"

> **Real PostgreSQL database** (Neon Cloud). All data persists across restarts. You can verify by restarting the backend — data survives. The audit trail has database triggers that physically block UPDATE/DELETE operations.

### "Does the AI actually generate the rationale or is it hardcoded?"

> **Real Gemini 3.8 Flash API calls** with 8-key failover. You can see the API call in action — each rationale is unique and references the specific SKUs, quantities, and check results. If the LLM is offline, the system falls back to deterministic templates and **honestly labels them as `template`** — never pretends they're AI-generated.

### "What happens if I approve the same order twice?"

> **409 Conflict** — the system has double-decision protection. The approval status is checked before processing, and duplicate signals return a conflict error.

### "What if the server crashes during an approval?"

> **Startup reconciliation** (`_reconcile_unsignalled_approvals` in `main.py`). On reboot, the system checks PostgreSQL for any approvals that were decided but whose Temporal signal was never delivered, and re-sends them automatically.

### "How do you prevent the LLM from hallucinating numbers?"

> **Deterministic Separation of Powers.** The LLM **never** calculates order quantities, budget values, or routing decisions. All numbers come from deterministic Python code. The LLM only explains the already-computed results in natural language.

### "Is the audit trail really immutable?"

> **Yes.** PostgreSQL `BEFORE UPDATE` and `BEFORE DELETE` triggers on the `audit_events` table raise exceptions if anyone tries to modify or delete records. You can verify this by clicking **"Verify Cryptographic Integrity"** on the Audit Trail page — it recomputes the full SHA-256 chain and checks trigger status.

### "What's the processing time?"

> **~14 seconds** end-to-end for a full replenishment check (signal detection + 5 constraint checks + LLM rationale + draft assembly + routing). Traditional manual process takes 6-10 minutes per PO.

---

## 15. Architecture Quick Reference

```
┌────────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite + TypeScript)             │
│   HomePage → RunDetailPage → ApprovalQueue → AuditTrail → Dash    │
└───────────────────────────────┬────────────────────────────────────┘
                                │ REST API
┌───────────────────────────────▼────────────────────────────────────┐
│                      FastAPI Backend (Python)                      │
│                                                                    │
│   ┌──────────┐  ┌───────────────┐  ┌──────────┐  ┌────────────┐  │
│   │ Signal   │→ │ Constraint    │→ │ Draft    │→ │ Routing    │  │
│   │ Agent    │  │ Agent (5 chk) │  │ Agent    │  │ Agent      │  │
│   └──────────┘  └───────────────┘  └──────────┘  └────────────┘  │
│                                                                    │
│   LangGraph StateGraph orchestration                               │
│   Temporal Durable Execution (simulator mode)                      │
│   LLM: Gemini 3.8 Flash (8-key pool) → Grok → Template fallback  │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   PostgreSQL (Neon)    │
                    │   - stores, skus       │
                    │   - runs, signals      │
                    │   - draft_actions      │
                    │   - approval_requests  │
                    │   - purchase_orders    │
                    │   - sent_emails        │
                    │   - audit_events (imm) │
                    └───────────────────────┘
```

### Agent Pipeline Flow

```
1. SignalAgent     → Scans inventory, detects SKUs below 6-day reorder threshold
2. ConstraintAgent → Runs 5 deterministic checks (MOQ, lead time, budget, credit, supplier)
3. DraftAgent      → Assembles ERP PO + supplier email + LLM rationale
4. RoutingAgent    → Classifies risk tier, routes to approval authority
5. ApprovalGate    → Pauses workflow (auto-approve OR human gate)
6. ExecutionAgent  → Creates PO in ERP + sends supplier email
```

### Policy Routing Matrix

| Condition | Route | Persona |
|-----------|-------|---------|
| Total ≤ ₹10,000 + approved supplier + all PASS | **Auto-Approve** | None needed |
| Total ₹10,001–₹50,000 + no FAIL | **Store Manager** | Priya Sharma / Rakesh Verma |
| Total > ₹50,000 OR any FAIL OR HIGH risk | **Regional Manager** | Anita Deshmukh |

---

## Recommended Demo Flow (5 Minutes)

1. **[30s]** Show the homepage, explain the architecture briefly
2. **[90s]** Run **STORE-214** (hero scenario) → show Decision Card → approve → show PO + email
3. **[30s]** Reset demo data
4. **[45s]** Run **STORE-087** (auto-approve) → show it completes without human intervention
5. **[30s]** Reset demo data
6. **[45s]** Run **STORE-312** (escalation) → switch to Regional Manager → show FAIL checks
7. **[30s]** Show **Audit Trail** → click "Verify Cryptographic Integrity"
8. **[30s]** Show **Metrics Dashboard** → point out real aggregated data

**Total: ~5 minutes**

---

*Last updated: November 2026*

# Veyronica — Governed Agentic Replenishment Platform

> **V-Mart Governed Agentic Replenishment Platform**  
> *Deterministic Separation: Code decides, AI explains.*  
> **SIH 2026 Production Build** • [GitHub Repository](https://github.com/YugPatel11/Veyronica)

---

## 1. Executive Summary

**Veyronica** is a governed agentic execution platform designed for retail store replenishment, modeled on V-Mart's 497 stores across Tier-II, Tier-III, and Tier-IV India operating on Ginesys ERP.

In conventional retail procurement, purchase order creation requires **6–10 minutes per document** (reduced to **~1 minute** with Supplymint's DigiProc). Veyronica automates signal evaluation down to **~14 seconds** while enforcing a deterministic, human-gated execution loop:
1. **Autonomous Signal Detection:** Monitors inventory against 6-day reorder thresholds and calculates replenishment quantities to restore 14-day target covers.
2. **Deterministic Separation ("Code decides, AI explains"):** All business rules (MOQ, delivery lead times, store budget headroom, supplier credit limits, risk tiers) run strictly in deterministic Python. The LLM is confined strictly to generating human-readable rationales and drafting supplier notification emails.
3. **Durable Approval Gate (Temporal HITL):** Workflows pause at human approval gates (`workflow.wait_condition`), surviving process termination, server restarts, and connection drops without sleep or in-memory timers.
4. **Dual Gated Actions:** Approving an order atomically triggers both the ERP purchase order creation AND the supplier notification email dispatch.
5. **Immutable Append-Only Audit Trail:** Database triggers block `UPDATE` and `DELETE` on the `audit_events` table, preserving an unalterable history of every action.

---

## 2. Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Veyronica Web Application                       │
│        (React 18 + Vite + TypeScript + Tailwind CSS + Recharts)        │
│    - Global "Acting as" Persona Switcher (Store vs. Regional Manager)  │
│    - "Code decides, AI explains" Side-by-Side Decision Card            │
│    - Live Step Timeline & Filterable Audit Event Viewer                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST / SSE
┌───────────────────────────────────▼────────────────────────────────────┐
│                        FastAPI Backend Engine                          │
│    - Rest Endpoints (/workflows, /runs, /approvals, /audit)            │
│    - Single Source-of-Truth Policy Routing Engine (Section 4.3)        │
│    - Persistence-Before-Signal Contract with Startup Reconciliation   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
┌───────────────────────────────┐           ┌───────────────────────────────┐
│       Temporal Engine         │           │      PostgreSQL Database      │
│  - Durable Workflow Execution │           │  - Runs, Signals & Drafts     │
│  - wait_condition HITL Pause  │           │  - Simulated Ginesys ERP      │
│  - Idempotent Activities      │           │  - Append-Only Audit Triggers │
└───────────────────────────────┘           └───────────────────────────────┘
```

---

## 3. Quickstart & Setup

### Option 1: Docker Compose (Plan A — Complete Stack)
```bash
# 1. Clone repository
git clone https://github.com/YugPatel11/Veyronica.git
cd Veyronica

# 2. Configure environment
cp .env.example .env

# 3. Start PostgreSQL, Temporal, API, Worker, and Frontend
docker compose up -d

# 4. Populate seed data
docker compose exec api python scripts/seed.py
```
- Frontend UI: `http://localhost:5173`
- Backend API Docs: `http://localhost:8000/docs`
- Temporal Web UI: `http://localhost:8233`

### Option 2: Local Development (Plan B)
```bash
# 1. Install Backend Dependencies
cd backend
pip install -e ".[dev]"

# 2. Run Database Migrations and Seed
psql $DATABASE_URL < ../scripts/seed.sql
# Or: python ../scripts/seed.py

# 3. Launch API Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 4. Launch Temporal Worker (in a separate terminal)
python -m app.temporal.worker

# 5. Launch Frontend (in a separate terminal)
cd ../frontend
npm install
npm run dev
```

---

## 4. 60-Second Demo Script

| Step | Store | Persona ("Acting as") | Action & Expected Behavior |
|---|---|---|---|
| **1** | `STORE-214` | *Priya Sharma (Store Manager)* | Click **Run Replenishment Check**. Stock drops to 4 days across jeans and kurti SKUs. Generates ₹42,000 order to SUP-1042. Budget check returns `FLAG` (70% headroom utilized). Policy routes to **Store Manager**. Inspect Decision Card showing "Code decides, AI explains" split. Click **Approve & Execute PO** -> PO created in ERP and email sent. |
| **2** | `STORE-087` | *Any Persona* | Select `STORE-087` and trigger check. Small order under ₹10,000 from approved supplier. All checks PASS -> **Auto-Approved** without human pause. |
| **3** | `STORE-312` | *Anita Deshmukh (Regional Manager)* | Select `STORE-312` and trigger check. Budget spent near cap causes `FAIL` or value escalation. Policy automatically routes to **Regional Procurement Manager**. |

---

## 5. Resilience & "If It Breaks" Checklist (Safety Net)

| Component | Failure Mode | Plan A (Primary) | Plan B (Fallback) | Plan C (Safety Net) |
|---|---|---|---|---|
| **Database** | Connection loss / corrupted data | Docker PostgreSQL (`5432`) | Local PostgreSQL | Restore demo state in <10s: `psql $DATABASE_URL < scripts/seed.sql` |
| **Temporal Engine** | Worker crash / process killed | Native Temporal auto-reconnect | Docker Compose restart | Workflows pause durably; startup reconciliation in `app/main.py` detects unsignalled approvals and resumes state cleanly |
| **LLM Provider** | Rate-limit / API quota / offline | OpenAI `gpt-4o` | Secondary LLM provider (Anthropic / Gemini) | Automatic zero-downtime failover to deterministic templates (honestly labelled as `template`) |
| **Approvals** | Power outage mid-decision | In-memory resume | Database persistence before signal | Double-decision protection returns `409 Conflict`; signal retried on boot |

---

## 6. Verification & Automated Tests

All tests run cleanly with zero warnings:
```bash
# Run all unit and contract tests
pytest

# Test deterministic constraint checks (Section 4.2)
pytest tests/test_checks.py

# Test approval routing policy table (Section 4.3)
pytest tests/test_policy.py

# Test LLM fallback safety nets (Plan C template generation)
pytest tests/test_llm_client.py

# Test agent order sizing and hero scenario
pytest tests/test_agents.py

# Test approval role hierarchy and rejection validation
pytest tests/test_api_approvals.py
```
For durability and restart procedure documentation, refer to [`tests/test_restart_durability.md`](tests/test_restart_durability.md).

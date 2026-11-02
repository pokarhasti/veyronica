# Veyronica — Governed Agentic Replenishment Platform

> **V-Mart Governed Agentic Replenishment Platform**  
> *Deterministic Separation: Code decides, AI explains.*

---

## 1. Overview

**Veyronica** is a governed agentic execution layer modeled after V-Mart's 497 stores across Tier-II, Tier-III, and Tier-IV India operating on Ginesys retail ERP.

In standard procurement, purchase order creation takes 6–10 minutes per document (reduced to ~1 min with DigiProc). Veyronica closes the loop between automated replenishment analysis and durable, human-gated ERP execution:
- **Autonomous Signal Detection:** Continuously evaluates inventory levels against 6-day reorder thresholds and 14-day target covers.
- **Deterministic Separation:** "Code decides, AI explains." Constraint evaluation (MOQ, lead times, budget headroom, credit limits) runs purely in deterministic code. The LLM is confined strictly to drafting explanatory rationales and supplier notification emails.
- **Durable Approval Gate:** Powered by **Temporal Python SDK**, the workflow structurally pauses at human approval checkpoints (`workflow.wait_condition`), surviving server restarts and network interruptions indefinitely.
- **Dual Gated Actions:** Approved execution creates the ERP purchase order AND dispatches the supplier confirmation email.
- **Immutable Append-Only Audit Trail:** Postgres triggers strictly block updates and deletes, recording every transition and decision.

---

## 2. Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   Veyronica Web UI                     │
│    (React 18 + Vite + TypeScript + Tailwind + Recharts) │
│    - Global "Acting as" Persona Switcher               │
│    - Side-by-side "Code decides, AI explains" Card     │
└───────────────────────────┬────────────────────────────┘
                            │ REST / SSE
┌───────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                     │
│    - REST Endpoints (/workflows, /approvals, /audit)   │
│    - Single source-of-truth policy routing             │
│    - Persistence-before-signal approval contract       │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     Temporal Workflow     │ │       PostgreSQL          │
│ - Durable Activity Steps  │ │ - Core runs & drafts      │
│ - Structural Pause Gate   │ │ - Immutable audit_events  │
│ - Signal-based Resume     │ │ - Simulated Ginesys ERP   │
└───────────────────────────┘ └───────────────────────────┘
```

---

## 3. Quickstart & Setup

### Prerequisites
- Python 3.12+
- Docker & Docker Compose (or local PostgreSQL and Temporal CLI)
- Node.js 18+ (for frontend)

### Installation

1. **Clone and Setup Environment:**
   ```bash
   cp .env.example .env
   ```

2. **Run with Docker Compose (Plan A):**
   ```bash
   docker compose up -d
   ```

3. **Or Run Locally (Plan B):**
   ```bash
   # Backend
   cd backend
   pip install -e .
   python -m app.main

   # Temporal Worker
   python -m app.temporal.worker

   # Frontend
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Seed Database:**
   ```bash
   python scripts/seed.py
   # Or directly: psql $DATABASE_URL < scripts/seed.sql
   ```

---

## 4. 60-Second Demo Script

1. **STORE-214 (Hero Scenario):**
   - Trigger replenishment for `STORE-214`.
   - Observe live step timeline: signal -> checks -> draft -> route -> approval gate.
   - Switch persona to **Priya Sharma (Store Manager)**.
   - Review Decision Card: side-by-side deterministic checks (MOQ PASS, Lead Time PASS, Budget FLAG 70%, Credit PASS) vs. AI explanation.
   - Click **Approve** -> PO created in simulated Ginesys ERP and supplier email recorded.
2. **STORE-087 (Auto-Approve Path):**
   - Trigger replenishment for `STORE-087` (small order <= ₹10,000 from approved supplier).
   - Observe automatic approval without human pause.
3. **STORE-312 (Manager Escalation):**
   - Trigger replenishment for `STORE-312` (budget limit exceeded).
   - Observe automatic routing to **Anita Deshmukh (Regional Procurement Manager)**.

---

## 5. Resilience & "If It Breaks" Safety Net

| Failure Scenario | Plan A (Primary) | Plan B (Fallback) | Plan C (Safety Net) |
|---|---|---|---|
| **Database** | Docker Compose PostgreSQL | Local PostgreSQL on port 5432 | Managed Neon/Supabase via `DATABASE_URL` |
| **Temporal Engine** | Local Temporal CLI / Dev Server | Docker Compose Temporal Service | Temporal Cloud Free Tier |
| **LLM Provider** | OpenAI `gpt-4o` | Anthropic Claude / Google Gemini | Deterministic template generation (zero downtime) |
| **Approval Interruption** | Instant resume via Temporal signal | Unsignalled approvals reconciled on API startup | Audit event verification + database state |

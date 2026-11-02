-- =============================================================================
-- Veyronica — Migration 001: Initial Schema
-- Postgres-only. JSONB, UUID, append-only audit triggers.
-- Run with: make migrate
-- =============================================================================

-- ─── Simulated source-system tables (Section 6.3) ───────────────────────────

CREATE TABLE IF NOT EXISTS stores (
    store_id        TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    monthly_budget  NUMERIC(14,2) NOT NULL,
    budget_spent    NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id       TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    approved          BOOLEAN NOT NULL DEFAULT TRUE,
    credit_limit      NUMERIC(14,2) NOT NULL,
    credit_outstanding NUMERIC(14,2) NOT NULL DEFAULT 0,
    email             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skus (
    sku             TEXT PRIMARY KEY,
    sku_name        TEXT NOT NULL,
    store_price     NUMERIC(10,2) NOT NULL,
    unit_cost       NUMERIC(10,2) NOT NULL,
    moq             INTEGER NOT NULL,
    supplier_id     TEXT NOT NULL REFERENCES suppliers(supplier_id),
    lead_time_days  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS store_stock (
    id                BIGSERIAL PRIMARY KEY,
    store_id          TEXT NOT NULL REFERENCES stores(store_id),
    sku               TEXT NOT NULL REFERENCES skus(sku),
    current_stock     INTEGER NOT NULL,
    sales_velocity_7d NUMERIC(10,4) NOT NULL,
    UNIQUE(store_id, sku)
);

CREATE TABLE IF NOT EXISTS warehouse_stock (
    sku      TEXT PRIMARY KEY REFERENCES skus(sku),
    quantity INTEGER NOT NULL DEFAULT 0
);

-- ─── Core workflow tables (Section 6.1) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS runs (
    run_id            UUID PRIMARY KEY,
    correlation_id    UUID NOT NULL,
    store_id          TEXT NOT NULL,
    temporal_wf_id    TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'running',
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    awaiting_since    TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    agent_prep_ms     INTEGER,
    approval_wait_ms  INTEGER
);

CREATE TABLE IF NOT EXISTS signals (
    signal_id  UUID PRIMARY KEY,
    run_id     UUID NOT NULL REFERENCES runs(run_id),
    payload    JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_actions (
    action_id       UUID PRIMARY KEY,
    run_id          UUID NOT NULL REFERENCES runs(run_id),
    action_type     TEXT NOT NULL,
    tool_name       TEXT NOT NULL,
    tool_args       JSONB NOT NULL,
    risk_class      TEXT NOT NULL,
    total_value     NUMERIC(14,2) NOT NULL,
    rationale       TEXT NOT NULL,
    rationale_source TEXT NOT NULL DEFAULT 'template',
    evidence_refs   JSONB NOT NULL,
    check_results   JSONB NOT NULL,
    draft_status    TEXT NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvers (
    approver_id TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL,
    store_id    TEXT
);

CREATE TABLE IF NOT EXISTS approval_requests (
    approval_id      UUID PRIMARY KEY,
    action_id        UUID NOT NULL REFERENCES draft_actions(action_id),
    run_id           UUID NOT NULL REFERENCES runs(run_id),
    assigned_role    TEXT NOT NULL,
    requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status           TEXT NOT NULL DEFAULT 'pending',
    decided_by       TEXT REFERENCES approvers(approver_id),
    decided_by_role  TEXT,
    decided_at       TIMESTAMPTZ,
    rejection_reason TEXT
);

-- ─── Simulated ERP write targets ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id       UUID PRIMARY KEY,
    action_id   UUID NOT NULL UNIQUE,           -- idempotency key
    run_id      UUID NOT NULL REFERENCES runs(run_id),
    store_id    TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    lines       JSONB NOT NULL,
    total_value NUMERIC(14,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sent_emails (
    email_id   UUID PRIMARY KEY,
    action_id  UUID NOT NULL UNIQUE,            -- idempotency key
    run_id     UUID NOT NULL REFERENCES runs(run_id),
    to_email   TEXT NOT NULL,
    subject    TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Append-only audit trail (Section 6.2) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_events (
    event_id        BIGSERIAL PRIMARY KEY,
    run_id          UUID NOT NULL,
    correlation_id  UUID NOT NULL,
    event_type      TEXT NOT NULL,
    actor_type      TEXT NOT NULL,               -- agent | human | system
    actor_id        TEXT NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_run  ON audit_events(run_id, event_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(event_type);

-- ─── Enforce append-only: reject UPDATE and DELETE ───────────────────────────

CREATE OR REPLACE FUNCTION audit_events_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_events;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();

DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_events;
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();

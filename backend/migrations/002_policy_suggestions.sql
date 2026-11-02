-- =============================================================================
-- Veyronica — Migration 002: Policy Suggestions Schema (Feature 2.5)
-- Stores suggestions derived from human rejection reasons to tune policy rules.
-- =============================================================================

CREATE TABLE IF NOT EXISTS policy_suggestions (
    suggestion_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL,
    approval_id     UUID NOT NULL,
    rejected_by     TEXT NOT NULL,
    rejection_reason TEXT NOT NULL,
    current_rule    TEXT NOT NULL,
    suggested_rule  TEXT NOT NULL,
    rationale       TEXT NOT NULL,
    confidence      NUMERIC(4,2) NOT NULL DEFAULT 0.85,
    status          TEXT NOT NULL DEFAULT 'suggested', -- suggested | applied | dismissed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_sug_status ON policy_suggestions(status);

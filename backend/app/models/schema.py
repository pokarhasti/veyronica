# =============================================================================
# Veyronica — SQLAlchemy ORM Models
# Maps to the database schema in Section 6 of PROJECT.md.
# Postgres-only: uses UUID, JSONB, NUMERIC, TIMESTAMPTZ.
# =============================================================================
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ─────────────────────────────────────────────────────────────────────────────
# Simulated source-system tables (Section 6.3)
# ─────────────────────────────────────────────────────────────────────────────

class StoreORM(Base):
    """Simulated V-Mart store with monthly budget tracking."""
    __tablename__ = "stores"

    store_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    monthly_budget = Column(Numeric(14, 2), nullable=False)
    budget_spent = Column(Numeric(14, 2), nullable=False, server_default=text("0"))


class SKUORM(Base):
    """SKU master — 12 V-Mart fashion SKUs."""
    __tablename__ = "skus"

    sku = Column(String, primary_key=True)
    sku_name = Column(String, nullable=False)
    store_price = Column(Numeric(10, 2), nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    moq = Column(Integer, nullable=False)
    supplier_id = Column(String, ForeignKey("suppliers.supplier_id"), nullable=False)
    lead_time_days = Column(Integer, nullable=False)


class SupplierORM(Base):
    """Supplier master with credit limit and approval status."""
    __tablename__ = "suppliers"

    supplier_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    approved = Column(Boolean, nullable=False, server_default=text("true"))
    credit_limit = Column(Numeric(14, 2), nullable=False)
    credit_outstanding = Column(Numeric(14, 2), nullable=False, server_default=text("0"))
    email = Column(String, nullable=False)


class StoreStockORM(Base):
    """Current stock per store-SKU (36 rows for 3 stores × 12 SKUs)."""
    __tablename__ = "store_stock"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    store_id = Column(String, ForeignKey("stores.store_id"), nullable=False)
    sku = Column(String, ForeignKey("skus.sku"), nullable=False)
    current_stock = Column(Integer, nullable=False)
    sales_velocity_7d = Column(Numeric(10, 4), nullable=False)  # units/day avg over 7 days

    __table_args__ = (
        Index("uq_store_sku", "store_id", "sku", unique=True),
    )


class WarehouseStockORM(Base):
    """Warehouse stock per SKU (central warehouse)."""
    __tablename__ = "warehouse_stock"

    sku = Column(String, ForeignKey("skus.sku"), primary_key=True)
    quantity = Column(Integer, nullable=False, server_default=text("0"))


class PurchaseOrderORM(Base):
    """Simulated ERP purchase order — the write target of execution."""
    __tablename__ = "purchase_orders"

    po_id = Column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    action_id = Column(UUID(as_uuid=True), unique=True, nullable=False)  # idempotency key
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.run_id"), nullable=False)
    store_id = Column(String, nullable=False)
    supplier_id = Column(String, nullable=False)
    lines = Column(JSONB, nullable=False)
    total_value = Column(Numeric(14, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)


class SentEmailORM(Base):
    """Record of supplier emails sent (simulated)."""
    __tablename__ = "sent_emails"

    email_id = Column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    action_id = Column(UUID(as_uuid=True), nullable=False)  # idempotency key
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.run_id"), nullable=False)
    to_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (
        Index("uq_sent_email_action", "action_id", unique=True),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Core workflow tables (Section 6.1)
# ─────────────────────────────────────────────────────────────────────────────

class RunORM(Base):
    """A single replenishment workflow run."""
    __tablename__ = "runs"

    run_id = Column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    correlation_id = Column(UUID(as_uuid=True), nullable=False, default=_new_uuid)
    store_id = Column(String, nullable=False)
    temporal_wf_id = Column(String, nullable=False, server_default=text("''"))
    status = Column(
        String, nullable=False, server_default=text("'running'")
    )  # running | awaiting_approval | completed | rejected | failed
    started_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    awaiting_since = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    agent_prep_ms = Column(Integer, nullable=True)
    approval_wait_ms = Column(Integer, nullable=True)

    # Relationships
    signals = relationship("SignalORM", back_populates="run", lazy="selectin")
    draft_actions = relationship("DraftActionORM", back_populates="run", lazy="selectin")
    approval_requests = relationship("ApprovalRequestORM", back_populates="run", lazy="selectin")


class SignalORM(Base):
    """Detected replenishment signals for a run."""
    __tablename__ = "signals"

    signal_id = Column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.run_id"), nullable=False)
    payload = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    run = relationship("RunORM", back_populates="signals")


class DraftActionORM(Base):
    """Draft purchase order or supplier email awaiting approval."""
    __tablename__ = "draft_actions"

    action_id = Column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.run_id"), nullable=False)
    action_type = Column(String, nullable=False)  # create_purchase_order | send_supplier_email
    tool_name = Column(String, nullable=False)
    tool_args = Column(JSONB, nullable=False)
    risk_class = Column(String, nullable=False)  # low | medium | high
    total_value = Column(Numeric(14, 2), nullable=False)
    rationale = Column(Text, nullable=False)
    rationale_source = Column(
        String, nullable=False, server_default=text("'template'")
    )  # 'ai_generated' | 'template' — honest labelling
    evidence_refs = Column(JSONB, nullable=False)
    check_results = Column(JSONB, nullable=False)
    draft_status = Column(
        String, nullable=False, server_default=text("'draft'")
    )  # draft | pending_approval | approved | rejected | executed | failed
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    run = relationship("RunORM", back_populates="draft_actions")


class ApproverORM(Base):
    """Seeded persona table for the 'Acting as' switcher. No auth."""
    __tablename__ = "approvers"

    approver_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # store_manager | regional_manager
    store_id = Column(String, nullable=True)  # NULL means "all stores"


class ApprovalRequestORM(Base):
    """An approval request assigned to a role, decided by a persona."""
    __tablename__ = "approval_requests"

    approval_id = Column(UUID(as_uuid=True), primary_key=True, default=_new_uuid)
    action_id = Column(UUID(as_uuid=True), ForeignKey("draft_actions.action_id"), nullable=False)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.run_id"), nullable=False)
    assigned_role = Column(String, nullable=False)  # store_manager | regional_manager
    requested_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    status = Column(
        String, nullable=False, server_default=text("'pending'")
    )  # pending | approved | rejected
    decided_by = Column(String, ForeignKey("approvers.approver_id"), nullable=True)
    decided_by_role = Column(String, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)  # mandatory on reject, min 20 chars

    run = relationship("RunORM", back_populates="approval_requests")


# ─────────────────────────────────────────────────────────────────────────────
# Append-only audit trail (Section 6.2)
# Triggers enforcing immutability are in migrations/001_initial.sql
# ─────────────────────────────────────────────────────────────────────────────

class AuditEventORM(Base):
    """
    Immutable audit event log. Every state transition writes exactly one event.
    UPDATE and DELETE are blocked by database triggers.
    """
    __tablename__ = "audit_events"

    event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    run_id = Column(UUID(as_uuid=True), nullable=False)
    correlation_id = Column(UUID(as_uuid=True), nullable=False)
    event_type = Column(String, nullable=False)
    actor_type = Column(String, nullable=False)  # agent | human | system
    actor_id = Column(String, nullable=False)
    payload = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (
        Index("idx_audit_run", "run_id", "event_id"),
        Index("idx_audit_type", "event_type"),
    )

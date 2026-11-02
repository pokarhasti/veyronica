# =============================================================================
# Veyronica — Postgres-backed Simulated ERP Adapter
# Implements ERPAdapter protocol against Ginesys retail schema.
# Idempotent write: duplicate action_id returns existing PO.
# =============================================================================
from __future__ import annotations

import json
import logging
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.protocols import BudgetRecord, POResult, SupplierRecord
from app.models.domain import DraftAction

logger = logging.getLogger("veyronica.adapters.erp")


class PostgresERPAdapter:
    """Reads suppliers/budgets and writes purchase orders into PostgreSQL tables."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def read_supplier(self, supplier_id: str) -> SupplierRecord:
        result = await self.session.execute(
            text("""
                SELECT supplier_id, name, approved, credit_limit, credit_outstanding, email
                FROM suppliers
                WHERE supplier_id = :id
            """),
            {"id": supplier_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError(f"Supplier {supplier_id} not found in ERP")
        return SupplierRecord(
            supplier_id=row["supplier_id"],
            name=row["name"],
            approved=bool(row["approved"]),
            credit_limit=Decimal(str(row["credit_limit"])),
            credit_outstanding=Decimal(str(row["credit_outstanding"])),
            email=row["email"],
        )

    async def read_purchase_history(
        self, supplier_id: str | None = None, store_id: str | None = None, limit: int = 10
    ) -> list[dict[str, Any]]:
        conditions = []
        params: dict[str, Any] = {"limit": limit}
        if supplier_id:
            conditions.append("supplier_id = :supplier_id")
            params["supplier_id"] = supplier_id
        if store_id:
            conditions.append("store_id = :store_id")
            params["store_id"] = store_id
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        result = await self.session.execute(
            text(f"""
                SELECT po_id, run_id, store_id, supplier_id, total_value, created_at
                FROM purchase_orders
                {where}
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            params,
        )
        return [dict(r) for r in result.mappings().all()]

    async def read_budget(self, store_id: str) -> BudgetRecord:
        result = await self.session.execute(
            text("""
                SELECT store_id, monthly_budget, budget_spent
                FROM stores
                WHERE store_id = :store_id
            """),
            {"store_id": store_id},
        )
        row = result.mappings().first()
        if not row:
            raise ValueError(f"Store {store_id} not found in ERP")
        return BudgetRecord(
            store_id=row["store_id"],
            monthly_budget=Decimal(str(row["monthly_budget"])),
            budget_spent=Decimal(str(row["budget_spent"])),
        )

    async def create_purchase_order(self, draft: DraftAction) -> POResult:
        """
        Idempotently create a purchase order in the simulated Ginesys ERP.
        If a PO with this action_id already exists, return it (idempotency).
        """
        action_uuid = uuid.UUID(str(draft.action_id))
        existing = await self.session.execute(
            text("SELECT po_id, total_value FROM purchase_orders WHERE action_id = :action_id"),
            {"action_id": action_uuid},
        )
        row = existing.mappings().first()
        if row:
            logger.info("PO already exists for action_id %s (idempotent replay)", draft.action_id)
            return POResult(
                po_id=str(row["po_id"]),
                action_id=str(draft.action_id),
                status="created",
                total_value=Decimal(str(row["total_value"])),
            )

        po_uuid = uuid.uuid4()
        run_uuid = uuid.UUID(str(draft.run_id))
        supplier_id = draft.tool_args.get("supplier_id", "")
        store_id = draft.tool_args.get("store_id", "")
        lines = draft.tool_args.get("lines", [])

        # Serialize lines to JSON
        lines_json = json.dumps(lines)

        await self.session.execute(
            text("""
                INSERT INTO purchase_orders (po_id, action_id, run_id, store_id, supplier_id, lines, total_value, created_at)
                VALUES (:po_id, :action_id, :run_id, :store_id, :supplier_id, CAST(:lines AS JSONB), :total_value, NOW())
            """),
            {
                "po_id": po_uuid,
                "action_id": action_uuid,
                "run_id": run_uuid,
                "store_id": store_id,
                "supplier_id": supplier_id,
                "lines": lines_json,
                "total_value": float(draft.total_value),
            },
        )

        # Update store budget spent and supplier credit outstanding
        await self.session.execute(
            text("""
                UPDATE stores
                SET budget_spent = budget_spent + :val
                WHERE store_id = :store_id
            """),
            {"val": float(draft.total_value), "store_id": store_id},
        )
        await self.session.execute(
            text("""
                UPDATE suppliers
                SET credit_outstanding = credit_outstanding + :val
                WHERE supplier_id = :supplier_id
            """),
            {"val": float(draft.total_value), "supplier_id": supplier_id},
        )

        logger.info(
            "Created simulated ERP Purchase Order %s for store %s (₹%s)",
            po_uuid,
            store_id,
            draft.total_value,
        )

        return POResult(
            po_id=str(po_uuid),
            action_id=str(draft.action_id),
            status="created",
            total_value=draft.total_value,
        )

# =============================================================================
# Veyronica — Execution Agent
# Section 2 & 11: Post-approval gated execution.
# Dual actions: 1. Creates ERP Purchase Order; 2. Sends Supplier Email.
# =============================================================================
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.erp_adapter import PostgresERPAdapter
from app.adapters.protocols import EmailResult, POResult
from app.adapters.supplier_adapter import PostgresSupplierAdapter
from app.llm.client import LLMClient
from app.models.domain import DraftAction

logger = logging.getLogger("veyronica.agents.execution")


class ExecutionAgent:
    """Executes gated write actions (ERP Purchase Order + Supplier Email) upon approval."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.erp = PostgresERPAdapter(session)
        self.supplier = PostgresSupplierAdapter(session)
        self.llm = LLMClient()

    async def execute_draft(
        self,
        draft: DraftAction,
    ) -> dict[str, Any]:
        """
        Execute both the purchase order write to ERP and supplier confirmation email.
        """
        # 1. Gated Action 1: Create Purchase Order in ERP
        po_res = await self.erp.create_purchase_order(draft)

        # 2. Gated Action 2: Dispatch Supplier Notification Email
        supplier_id = draft.tool_args.get("supplier_id", "")
        supplier_rec = await self.erp.read_supplier(supplier_id)
        store_id = draft.tool_args.get("store_id", "")
        lines = draft.tool_args.get("lines", [])

        email_body, source = await self.llm.generate_supplier_email(
            supplier_name=supplier_rec.name,
            store_id=store_id,
            lines=lines,
            total_value=float(draft.total_value),
        )

        email_res = await self.supplier.send_email(
            to=supplier_rec.email,
            subject=f"V-Mart Purchase Order {po_res.po_id[:8]} - Store {store_id}",
            body=email_body,
            action_id=str(draft.action_id),
            run_id=str(draft.run_id),
        )

        logger.info(
            "Dual gated actions executed successfully for action %s: PO %s and Email to %s",
            draft.action_id,
            po_res.po_id,
            email_res.to_email,
        )

        return {
            "po_id": po_res.po_id,
            "status": "executed",
            "email_id": email_res.email_id,
            "to_email": email_res.to_email,
        }

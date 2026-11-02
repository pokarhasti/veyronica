# =============================================================================
# Veyronica — Draft Agent
# Section 5.3: Assembles draft purchase orders and notification emails.
# "Code decides, AI explains": LLM is used strictly for drafting explanatory
# text and email phrasing, falling back to deterministic templates if offline.
# =============================================================================
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.client import LLMClient
from app.models.domain import CheckResult, DraftAction, DraftLine, ReplenishmentSignal


class DraftAgent:
    """Creates draft purchase order actions and supplier notification drafts."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.llm_client = LLMClient()

    async def create_po_draft(
        self,
        run_id: str,
        store_id: str,
        supplier_id: str,
        supplier_name: str,
        lines: list[dict[str, Any]],
        checks: list[CheckResult],
        risk_class: str,
    ) -> DraftAction:
        """
        Build draft purchase order action with AI rationale and evidence refs.
        """
        total_val = sum(Decimal(str(l["line_value"])) for l in lines)
        draft_lines = [
            DraftLine(
                sku=l["sku"],
                sku_name=l["sku_name"],
                qty=l["qty"],
                unit_cost=Decimal(str(l["unit_cost"])),
                line_value=Decimal(str(l["line_value"])),
            )
            for l in lines
        ]

        # Generate explanatory rationale
        rationale, source = await self.llm_client.generate_rationale(
            store_id=store_id,
            lines=lines,
        )

        action_id = str(uuid.uuid4())
        evidence_refs = [f"check:{c.check_name}:{c.status}" for c in checks]

        return DraftAction(
            action_id=action_id,
            run_id=run_id,
            action_type="create_purchase_order",
            tool_name="create_purchase_order",
            tool_args={
                "store_id": store_id,
                "supplier_id": supplier_id,
                "supplier_name": supplier_name,
                "lines": [dl.model_dump(mode="json") for dl in draft_lines],
            },
            risk_class=risk_class,
            total_value=total_val,
            rationale=rationale,
            rationale_source=source,
            evidence_refs=evidence_refs,
            check_results=checks,
            draft_status="draft",
        )

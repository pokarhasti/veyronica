# =============================================================================
# Veyronica — Constraint Agent
# Section 4.2: Evaluates deterministic business rules across replenishment lines.
# =============================================================================
from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.checks.budget import check_budget_headroom
from app.checks.credit import check_credit_limit
from app.checks.lead_time import check_lead_time
from app.checks.moq import check_moq
from app.models.domain import CheckResult, ReplenishmentSignal


class ConstraintAgent:
    """Evaluates deterministic checks on proposed replenishment orders."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def evaluate_supplier_order(
        self,
        store_id: str,
        supplier_id: str,
        lines: list[dict[str, Any]],
        po_value: Decimal,
    ) -> list[CheckResult]:
        """
        Run MOQ, lead time, store budget, and supplier credit limit checks.
        """
        # 1. MOQ Check
        moq_res = check_moq(lines)

        # 2. Lead Time Check
        lead_res = check_lead_time(lines)

        # 3. Store Budget Headroom Check
        store_res = await self.session.execute(
            text("SELECT monthly_budget, budget_spent FROM stores WHERE store_id = :id"),
            {"id": store_id},
        )
        store_row = store_res.mappings().first()
        monthly_budget = Decimal(str(store_row["monthly_budget"])) if store_row else Decimal("100000")
        budget_spent = Decimal(str(store_row["budget_spent"])) if store_row else Decimal("0")
        budget_res = check_budget_headroom(po_value, monthly_budget, budget_spent)

        # 4. Supplier Credit Limit Check
        sup_res = await self.session.execute(
            text("SELECT credit_limit, credit_outstanding, approved FROM suppliers WHERE supplier_id = :id"),
            {"id": supplier_id},
        )
        sup_row = sup_res.mappings().first()
        credit_limit = Decimal(str(sup_row["credit_limit"])) if sup_row else Decimal("200000")
        credit_outstanding = Decimal(str(sup_row["credit_outstanding"])) if sup_row else Decimal("0")
        credit_res = check_credit_limit(po_value, credit_limit, credit_outstanding)

        return [moq_res, lead_res, budget_res, credit_res]

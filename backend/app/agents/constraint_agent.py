# =============================================================================
# Veyronica — Constraint Agent
# Section 4.2: Evaluates deterministic business rules across replenishment lines.
# Integrates: MOQ, Lead Time, Store Budget, Credit Limit, Warehouse Stock (WH-NORTH-01),
# and Inter-Store Lateral Transfer opportunities.
# =============================================================================
from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.erp_adapter import PostgresERPAdapter
from app.adapters.inventory_adapter import PostgresInventoryAdapter
from app.checks.budget import check_budget_headroom
from app.checks.credit import check_credit_limit
from app.checks.lead_time import check_lead_time
from app.checks.moq import check_moq
from app.models.domain import CheckResult


class ConstraintAgent:
    """Evaluates deterministic checks and V-Mart supply chain allocations."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.inventory_adapter = PostgresInventoryAdapter(session)
        self.erp_adapter = PostgresERPAdapter(session)

    async def evaluate_supplier_order(
        self,
        store_id: str,
        supplier_id: str,
        lines: list[dict[str, Any]],
        po_value: Decimal,
    ) -> list[CheckResult]:
        """
        Run MOQ, lead time, store budget, supplier credit limit,
        warehouse-first DC allocation, and inter-store transfer checks.
        """
        # 1. MOQ Check
        moq_res = check_moq(lines)

        # 2. Lead Time Check (with stockout gap and estimated lost sales calculation)
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

        # 5. Innovation 3.1 & Adapter: Warehouse-First DC Allocation Check (WH-NORTH-01)
        total_wh_units = 0
        potential_dc_transfer_units = 0
        potential_dc_savings = Decimal("0")
        wh_details = []

        for line in lines:
            sku = line.get("sku", "")
            ordered_qty = int(line.get("qty", 0))
            unit_cost = Decimal(str(line.get("unit_cost", "0")))

            try:
                rec = await self.inventory_adapter.read_warehouse_stock(sku)
                wh_qty = rec.current_stock
            except Exception:
                wh_qty = 0

            alloc_from_wh = min(ordered_qty, wh_qty)
            total_wh_units += wh_qty
            potential_dc_transfer_units += alloc_from_wh
            potential_dc_savings += (alloc_from_wh * unit_cost)

            wh_details.append({
                "sku": sku,
                "warehouse_stock": wh_qty,
                "ordered_qty": ordered_qty,
                "can_fulfill_from_dc": alloc_from_wh,
            })

        if potential_dc_transfer_units > 0:
            dc_status = "PASS"
            dc_reason = (
                f"WH-NORTH-01 holds {total_wh_units} units for these SKUs. "
                f"Internal DC transfer can fulfill {potential_dc_transfer_units} units "
                f"(potential ₹{int(potential_dc_savings):,} OTB budget savings)."
            )
        else:
            dc_status = "PASS"
            dc_reason = "No central warehouse stock available at WH-NORTH-01; external vendor fulfillment required."

        dc_res = CheckResult(
            check_name="dc_allocation",
            status=dc_status,
            reason=dc_reason,
            numeric_evidence={
                "dc_id": "WH-NORTH-01",
                "total_warehouse_units": total_wh_units,
                "recommended_dc_transfer_units": potential_dc_transfer_units,
                "potential_otb_savings_inr": float(potential_dc_savings),
                "sku_allocations": wh_details,
            },
        )

        # 6. Innovation 3.2 & Adapter: Inter-Store Lateral Transfer Check
        peer_opportunities = []
        total_peer_surplus = 0

        for line in lines:
            sku = line.get("sku", "")
            try:
                surplus_list = await self.inventory_adapter.read_peer_stores_surplus(
                    sku=sku, exclude_store_id=store_id, min_days_cover=7.0
                )
                for item in surplus_list:
                    surplus_qty = int(item["current_stock"])
                    total_peer_surplus += surplus_qty
                    peer_opportunities.append({
                        "store_id": item["store_id"],
                        "sku": sku,
                        "surplus_units": surplus_qty,
                        "days_cover": float(item["days_cover"]),
                    })
            except Exception:
                pass

        # Also inspect historical purchase history for recent store PO velocity
        recent_pos = []
        try:
            recent_pos = await self.erp_adapter.read_purchase_history(
                supplier_id=supplier_id, store_id=store_id, limit=3
            )
        except Exception:
            pass

        if peer_opportunities:
            peer_status = "PASS"
            peer_reason = (
                f"Identified {len(peer_opportunities)} peer store surplus opportunities "
                f"({total_peer_surplus} units available across cluster with >7d cover)."
            )
        else:
            peer_status = "PASS"
            peer_reason = "No peer store lateral surplus detected across regional cluster."

        peer_res = CheckResult(
            check_name="peer_transfer",
            status=peer_status,
            reason=peer_reason,
            numeric_evidence={
                "peer_opportunities": peer_opportunities,
                "total_peer_surplus_units": total_peer_surplus,
                "recent_pos_count": len(recent_pos),
            },
        )

        return [moq_res, lead_res, budget_res, credit_res, dc_res, peer_res]

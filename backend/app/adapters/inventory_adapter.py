# =============================================================================
# Veyronica — Postgres-backed Simulated Inventory Adapter
# Implements InventoryAdapter protocol against Ginesys retail schema.
# =============================================================================
from __future__ import annotations

import logging
from typing import Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.protocols import StockRecord

logger = logging.getLogger("veyronica.adapters.inventory")


class PostgresInventoryAdapter:
    """Reads inventory and sales velocity from PostgreSQL store_stock and warehouse_stock."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def read_store_stock(self, store_id: str, sku: str) -> StockRecord:
        result = await self.session.execute(
            text("""
                SELECT store_id, sku, current_stock, sales_velocity_7d
                FROM store_stock
                WHERE store_id = :store_id AND sku = :sku
            """),
            {"store_id": store_id, "sku": sku},
        )
        row = result.mappings().first()
        if not row:
            return StockRecord(sku=sku, current_stock=0, sales_velocity_7d=0.0, store_id=store_id)
        return StockRecord(
            sku=row["sku"],
            current_stock=int(row["current_stock"]),
            sales_velocity_7d=float(row["sales_velocity_7d"]),
            store_id=row["store_id"],
        )

    async def read_all_store_stock(self, store_id: str) -> list[StockRecord]:
        result = await self.session.execute(
            text("""
                SELECT store_id, sku, current_stock, sales_velocity_7d
                FROM store_stock
                WHERE store_id = :store_id
                ORDER BY sku
            """),
            {"store_id": store_id},
        )
        rows = result.mappings().all()
        return [
            StockRecord(
                sku=r["sku"],
                current_stock=int(r["current_stock"]),
                sales_velocity_7d=float(r["sales_velocity_7d"]),
                store_id=r["store_id"],
            )
            for r in rows
        ]

    async def read_warehouse_stock(self, sku: str) -> StockRecord:
        result = await self.session.execute(
            text("""
                SELECT sku, quantity
                FROM warehouse_stock
                WHERE sku = :sku
            """),
            {"sku": sku},
        )
        row = result.mappings().first()
        qty = int(row["quantity"]) if row else 0
        return StockRecord(sku=sku, current_stock=qty, sales_velocity_7d=0.0)

    async def read_sales_velocity(self, store_id: str, sku: str) -> float:
        rec = await self.read_store_stock(store_id, sku)
        return rec.sales_velocity_7d

    async def read_peer_stores_surplus(
        self, sku: str, exclude_store_id: str, min_days_cover: float = 7.0
    ) -> list[dict[str, Any]]:
        """
        Scan peer V-Mart stores for surplus stock with >= min_days_cover.
        Useful for lateral inter-store inventory rebalancing.
        """
        result = await self.session.execute(
            text("""
                SELECT store_id, sku, current_stock, sales_velocity_7d,
                       ROUND((current_stock / NULLIF(sales_velocity_7d, 0))::NUMERIC, 1) AS days_cover
                FROM store_stock
                WHERE sku = :sku
                  AND store_id != :exclude_store_id
                  AND sales_velocity_7d > 0
                  AND (current_stock / sales_velocity_7d) >= :min_days_cover
                ORDER BY days_cover DESC
            """),
            {
                "sku": sku,
                "exclude_store_id": exclude_store_id,
                "min_days_cover": min_days_cover,
            },
        )
        return [dict(r) for r in result.mappings().all()]

# =============================================================================
# Veyronica — Signal Agent
# Section 4.1: Monitors store inventory and identifies under-stocked SKUs.
# Deterministic cover calculation and order quantity sizing.
# =============================================================================
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.domain import ReplenishmentSignal


def calculate_order_qty(
    current_stock: int,
    sales_velocity_7d: float,
    moq: int,
    target_cover_days: int = 14,
    pack_size: int = 10,
) -> int:
    """
    needed   = ceil(TARGET_COVER_DAYS × velocity − current_stock)
    qty      = max(MOQ, round_up_to_pack_size(needed))
    """
    needed = math.ceil(target_cover_days * sales_velocity_7d - current_stock)
    if needed <= 0:
        return 0

    # Round up to multiple of pack size
    remainder = needed % pack_size
    rounded = needed if remainder == 0 else needed + (pack_size - remainder)
    return max(moq, rounded)


class SignalAgent:
    """Detects replenishment signals across store inventory."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()

    async def detect_signals(
        self,
        store_id: str,
        run_id: str,
    ) -> list[ReplenishmentSignal]:
        """
        Query store_stock join skus for store_id.
        Raise signal when current_stock < reorder_threshold.
        """
        result = await self.session.execute(
            text("""
                SELECT ss.store_id, ss.sku, ss.current_stock, ss.sales_velocity_7d,
                       sk.sku_name, sk.unit_cost, sk.moq, sk.supplier_id, sk.lead_time_days
                FROM store_stock ss
                JOIN skus sk ON sk.sku = ss.sku
                WHERE ss.store_id = :store_id
            """),
            {"store_id": store_id},
        )
        rows = result.mappings().all()

        signals: list[ReplenishmentSignal] = []
        now = datetime.now(timezone.utc)

        for row in rows:
            stock = int(row["current_stock"])
            velocity = float(row["sales_velocity_7d"])
            if velocity <= 0:
                continue

            cover = stock / velocity
            reorder_threshold = math.ceil(self.settings.reorder_cover_days * velocity)

            if stock < reorder_threshold:
                sig = ReplenishmentSignal(
                    signal_id=str(uuid.uuid4()),
                    run_id=run_id,
                    sku=row["sku"],
                    sku_name=row["sku_name"],
                    store_id=store_id,
                    current_stock=stock,
                    reorder_threshold=reorder_threshold,
                    sales_velocity_7d=velocity,
                    days_of_cover=round(cover, 2),
                    supplier_id=row["supplier_id"],
                    created_at=now,
                )
                signals.append(sig)

        # Sort ascending by days_of_cover (lowest cover first)
        signals.sort(key=lambda s: s.days_of_cover)
        return signals

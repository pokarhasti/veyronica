# =============================================================================
# Veyronica — Admin API Router (Demo Only)
# Reset demo data and pre-seed a pending approval for demo safety.
# =============================================================================
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.domain import SimulateStoreStateRequest

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/reset-demo")
async def reset_demo():
    """
    Full demo reset: clear all workflow data and re-seed.
    Demo-only, unauthenticated.
    """
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".."))

    from scripts.seed import reset
    reset()
    return {"status": "ok", "message": "Demo data reset complete"}


@router.get("/store-state/{store_id}")
async def get_store_state(store_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch live store budget, stock, and velocity for sandbox simulator."""
    store_res = await db.execute(
        text("SELECT * FROM stores WHERE store_id = :id"),
        {"id": store_id},
    )
    store = store_res.mappings().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    stock_res = await db.execute(
        text("""
            SELECT ss.*, sk.sku_name, sk.unit_cost, sk.moq, sk.lead_time_days
            FROM store_stock ss
            JOIN skus sk ON sk.sku = ss.sku
            WHERE ss.store_id = :id
            ORDER BY ss.sku
        """),
        {"id": store_id},
    )
    stocks = [dict(r) for r in stock_res.mappings().all()]

    return {
        "store": dict(store),
        "stocks": stocks,
    }


@router.put("/simulate-store-state")
async def simulate_store_state(
    payload: SimulateStoreStateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Enhancement 4.1: Live ERP & Inventory Sandbox.
    Allows judges or presenters to dynamically tune store budget spent,
    stock levels, or sales velocity to force tier escalations.
    """
    # 1. Update budget spent / monthly budget if provided
    if payload.budget_spent is not None or payload.monthly_budget is not None:
        updates = []
        params: dict = {"store_id": payload.store_id}
        if payload.budget_spent is not None:
            updates.append("budget_spent = :budget_spent")
            params["budget_spent"] = payload.budget_spent
        if payload.monthly_budget is not None:
            updates.append("monthly_budget = :monthly_budget")
            params["monthly_budget"] = payload.monthly_budget
        if updates:
            await db.execute(
                text(f"UPDATE stores SET {', '.join(updates)} WHERE store_id = :store_id"),
                params,
            )

    # 2. Update SKU stock or velocity if provided
    if payload.sku:
        stock_updates = []
        stock_params: dict = {"store_id": payload.store_id, "sku": payload.sku}
        if payload.current_stock is not None:
            stock_updates.append("current_stock = :current_stock")
            stock_params["current_stock"] = payload.current_stock
        if payload.sales_velocity_7d is not None:
            stock_updates.append("sales_velocity_7d = :sales_velocity_7d")
            stock_params["sales_velocity_7d"] = payload.sales_velocity_7d
        if stock_updates:
            await db.execute(
                text(f"UPDATE store_stock SET {', '.join(stock_updates)} WHERE store_id = :store_id AND sku = :sku"),
                stock_params,
            )

    await db.commit()

    # Return updated state
    return await get_store_state(payload.store_id, db)

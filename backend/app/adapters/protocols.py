# =============================================================================
# Veyronica — Adapter Protocols
# Explicit Python Protocols for Inventory, ERP, and Supplier communications.
# Labelled in UI as "Simulated against Ginesys/retail ERP schema".
# =============================================================================
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Protocol

from app.models.domain import DraftAction


@dataclass
class StockRecord:
    sku: str
    current_stock: int
    sales_velocity_7d: float
    store_id: str | None = None


@dataclass
class SupplierRecord:
    supplier_id: str
    name: str
    approved: bool
    credit_limit: Decimal
    credit_outstanding: Decimal
    email: str


@dataclass
class BudgetRecord:
    store_id: str
    monthly_budget: Decimal
    budget_spent: Decimal

    @property
    def remaining(self) -> Decimal:
        return max(Decimal("0"), self.monthly_budget - self.budget_spent)


@dataclass
class POResult:
    po_id: str
    action_id: str
    status: str
    total_value: Decimal


@dataclass
class EmailResult:
    email_id: str
    action_id: str
    status: str
    to_email: str


class InventoryAdapter(Protocol):
    """Protocol for reading stock and sales velocity."""

    async def read_store_stock(self, store_id: str, sku: str) -> StockRecord:
        ...

    async def read_all_store_stock(self, store_id: str) -> list[StockRecord]:
        ...

    async def read_warehouse_stock(self, sku: str) -> StockRecord:
        ...

    async def read_sales_velocity(self, store_id: str, sku: str) -> float:
        ...


class ERPAdapter(Protocol):
    """Protocol for Ginesys ERP interactions (suppliers, budgets, PO creation)."""

    async def read_supplier(self, supplier_id: str) -> SupplierRecord:
        ...

    async def read_purchase_history(self, supplier_id: str) -> list[dict[str, Any]]:
        ...

    async def read_budget(self, store_id: str) -> BudgetRecord:
        ...

    async def create_purchase_order(self, draft: DraftAction) -> POResult:
        ...


class SupplierAdapter(Protocol):
    """Protocol for supplier email notifications."""

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        action_id: str,
        run_id: str,
    ) -> EmailResult:
        ...

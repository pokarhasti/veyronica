# =============================================================================
# Veyronica — Adapters Package
# =============================================================================
from app.adapters.protocols import (
    BudgetRecord,
    EmailResult,
    ERPAdapter,
    InventoryAdapter,
    POResult,
    StockRecord,
    SupplierAdapter,
    SupplierRecord,
)
from app.adapters.inventory_adapter import PostgresInventoryAdapter
from app.adapters.erp_adapter import PostgresERPAdapter
from app.adapters.supplier_adapter import PostgresSupplierAdapter

__all__ = [
    "BudgetRecord",
    "EmailResult",
    "ERPAdapter",
    "InventoryAdapter",
    "POResult",
    "PostgresERPAdapter",
    "PostgresInventoryAdapter",
    "PostgresSupplierAdapter",
    "StockRecord",
    "SupplierAdapter",
    "SupplierRecord",
]

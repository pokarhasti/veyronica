# =============================================================================
# Veyronica — Seed Data Script
# Loads V-Mart-style demo data (Section 10.1 of PROJECT.md).
# Uses a fixed random seed so every judge sees the same data after a reset.
#
# Usage: python -m scripts.seed   (from backend/ directory)
#        or: make seed
# =============================================================================
from __future__ import annotations

import sys
import os

# Add backend to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db import get_sync_engine


def seed():
    """Insert all demo data. Idempotent: uses ON CONFLICT DO NOTHING."""
    engine = get_sync_engine()

    with engine.begin() as conn:
        # ── Approvers (Section 4.5) ──────────────────────────────────────
        conn.execute(text("""
            INSERT INTO approvers (approver_id, name, role, store_id) VALUES
                ('APR-SM-214', 'Priya Sharma',    'store_manager',    'STORE-214'),
                ('APR-SM-087', 'Rakesh Verma',    'store_manager',    'STORE-087'),
                ('APR-RM-001', 'Anita Deshmukh',  'regional_manager', NULL)
            ON CONFLICT (approver_id) DO NOTHING
        """))

        # ── Stores (Section 10.1) ────────────────────────────────────────
        conn.execute(text("""
            INSERT INTO stores (store_id, name, monthly_budget, budget_spent) VALUES
                ('STORE-214', 'V-Mart Lucknow Gomtinagar',  150000, 90000),
                ('STORE-087', 'V-Mart Jaipur Vaishali',     100000, 30000),
                ('STORE-312', 'V-Mart Patna Boring Road',    80000, 70000)
            ON CONFLICT (store_id) DO NOTHING
        """))

        # ── Suppliers (Section 10.1) ─────────────────────────────────────
        conn.execute(text("""
            INSERT INTO suppliers (supplier_id, name, approved, credit_limit, credit_outstanding, email) VALUES
                ('SUP-1042', 'Supplier A', TRUE,  300000, 180000, 'supplier-a@example.com'),
                ('SUP-2087', 'Supplier B', TRUE,  200000,  90000, 'supplier-b@example.com'),
                ('SUP-3011', 'Supplier C', TRUE,  250000, 240000, 'supplier-c@example.com'),
                ('SUP-4055', 'Supplier D', FALSE, 100000,  20000, 'supplier-d@example.com')
            ON CONFLICT (supplier_id) DO NOTHING
        """))

        # ── SKU Master (12 SKUs, Section 10.1) ───────────────────────────
        conn.execute(text("""
            INSERT INTO skus (sku, sku_name, store_price, unit_cost, moq, supplier_id, lead_time_days) VALUES
                ('SKU-8821', 'Men''s Slim Jeans',            599, 360, 50, 'SUP-1042', 5),
                ('SKU-7732', 'Women''s Kurta Set',           449, 270, 40, 'SUP-1042', 6),
                ('SKU-9015', 'Men''s Cargo Trousers',        549, 320, 30, 'SUP-1042', 6),
                ('SKU-4410', 'Kids'' Cotton T-Shirt',        199, 120,100, 'SUP-2087', 3),
                ('SKU-4502', 'Kids'' Denim Shorts',          299, 170, 60, 'SUP-2087', 4),
                ('SKU-4618', 'Girls'' Cotton Frock',         349, 200, 50, 'SUP-2087', 4),
                ('SKU-3301', 'Men''s Formal Shirt',          399, 230, 60, 'SUP-3011', 4),
                ('SKU-3355', 'Men''s Formal Trousers',       599, 350, 40, 'SUP-3011', 5),
                ('SKU-3402', 'Men''s Casual Blazer',        1299, 780, 20, 'SUP-3011', 9),
                ('SKU-6120', 'Women''s Leggings',            249, 140, 80, 'SUP-4055', 3),
                ('SKU-6188', 'Men''s Cotton Vest (3-pack)',  279, 160, 60, 'SUP-4055', 3),
                ('SKU-6240', 'Women''s Cotton Dupatta',      199, 110, 80, 'SUP-4055', 4)
            ON CONFLICT (sku) DO NOTHING
        """))

        # ── Warehouse Stock ──────────────────────────────────────────────
        conn.execute(text("""
            INSERT INTO warehouse_stock (sku, quantity) VALUES
                ('SKU-8821', 500), ('SKU-7732', 400), ('SKU-9015', 300),
                ('SKU-4410', 800), ('SKU-4502', 350), ('SKU-4618', 300),
                ('SKU-3301', 400), ('SKU-3355', 250), ('SKU-3402', 100),
                ('SKU-6120', 600), ('SKU-6188', 450), ('SKU-6240', 500)
            ON CONFLICT (sku) DO NOTHING
        """))

        # ── Store Stock (36 rows: 3 stores × 12 SKUs) ────────────────────
        # STORE-214: Hero scenario — 3 SKUs below threshold for SUP-1042
        #   SKU-8821: 24 stock, 6/day velocity → 4 days cover (threshold 36)
        #   SKU-7732: 12 stock, 3/day → 4 days cover (threshold 18)
        #   SKU-9015:  8 stock, 2/day → 4 days cover (threshold 12)
        #   Other SKUs: comfortable stock levels
        #
        # STORE-087: Small PO scenario → auto-approve path
        #   One or two cheap SKUs slightly below threshold
        #
        # STORE-312: Budget-exceeded scenario → Regional Manager
        #   Large quantities needed, budget nearly exhausted (₹10k headroom)

        conn.execute(text("""
            INSERT INTO store_stock (store_id, sku, current_stock, sales_velocity_7d) VALUES
                -- STORE-214: Hero scenario (SUP-1042 SKUs below threshold)
                ('STORE-214', 'SKU-8821', 24, 6.0),    -- 4.0 days cover, threshold 36
                ('STORE-214', 'SKU-7732', 12, 3.0),    -- 4.0 days cover, threshold 18
                ('STORE-214', 'SKU-9015',  8, 2.0),    -- 4.0 days cover, threshold 12
                ('STORE-214', 'SKU-4410', 80, 2.0),    -- 40 days, OK
                ('STORE-214', 'SKU-4502', 50, 1.5),    -- 33 days, OK
                ('STORE-214', 'SKU-4618', 45, 1.0),    -- 45 days, OK
                ('STORE-214', 'SKU-3301', 70, 2.0),    -- 35 days, OK
                ('STORE-214', 'SKU-3355', 40, 1.0),    -- 40 days, OK
                ('STORE-214', 'SKU-3402', 15, 0.5),    -- 30 days, OK
                ('STORE-214', 'SKU-6120', 60, 2.0),    -- 30 days, OK
                ('STORE-214', 'SKU-6188', 50, 1.5),    -- 33 days, OK
                ('STORE-214', 'SKU-6240', 55, 1.0),    -- 55 days, OK

                -- STORE-087: Auto-approve scenario (small, approved supplier)
                ('STORE-087', 'SKU-4410', 10, 4.0),    -- 2.5 days cover → needs reorder (cheap SKU)
                ('STORE-087', 'SKU-4502', 55, 1.0),    -- 55 days, OK
                ('STORE-087', 'SKU-4618', 40, 1.0),    -- 40 days, OK
                ('STORE-087', 'SKU-8821', 60, 2.0),    -- 30 days, OK
                ('STORE-087', 'SKU-7732', 50, 1.5),    -- 33 days, OK
                ('STORE-087', 'SKU-9015', 45, 1.0),    -- 45 days, OK
                ('STORE-087', 'SKU-3301', 55, 1.5),    -- 37 days, OK
                ('STORE-087', 'SKU-3355', 35, 0.8),    -- 44 days, OK
                ('STORE-087', 'SKU-3402', 12, 0.3),    -- 40 days, OK
                ('STORE-087', 'SKU-6120', 65, 2.0),    -- 33 days, OK
                ('STORE-087', 'SKU-6188', 48, 1.0),    -- 48 days, OK
                ('STORE-087', 'SKU-6240', 50, 1.0),    -- 50 days, OK

                -- STORE-312: Regional Manager scenario (budget nearly exhausted)
                ('STORE-312', 'SKU-8821', 10, 5.0),    -- 2.0 days cover → big need
                ('STORE-312', 'SKU-7732',  5, 4.0),    -- 1.25 days cover → big need
                ('STORE-312', 'SKU-9015',  3, 3.0),    -- 1.0 days cover → big need
                ('STORE-312', 'SKU-4410', 15, 3.0),    -- 5.0 days cover → needs reorder
                ('STORE-312', 'SKU-4502', 50, 1.5),    -- 33 days, OK
                ('STORE-312', 'SKU-4618', 40, 1.0),    -- 40 days, OK
                ('STORE-312', 'SKU-3301', 10, 3.0),    -- 3.3 days cover → needs reorder
                ('STORE-312', 'SKU-3355',  8, 2.0),    -- 4.0 days cover → needs reorder
                ('STORE-312', 'SKU-3402',  5, 1.0),    -- 5.0 days cover → needs reorder
                ('STORE-312', 'SKU-6120', 12, 4.0),    -- 3.0 days cover → needs reorder
                ('STORE-312', 'SKU-6188', 10, 3.0),    -- 3.3 days cover → needs reorder
                ('STORE-312', 'SKU-6240',  8, 2.0)     -- 4.0 days cover → needs reorder
            ON CONFLICT (store_id, sku) DO UPDATE SET
                current_stock = EXCLUDED.current_stock,
                sales_velocity_7d = EXCLUDED.sales_velocity_7d
        """))

    print("[OK] Veyronica seed data loaded successfully.")
    print("   Stores: STORE-214 (hero), STORE-087 (auto-approve), STORE-312 (regional manager)")
    print("   SKUs: 12 | Suppliers: 4 | Approvers: 3")


def reset():
    """
    Full demo reset: truncate workflow tables then re-seed.
    Preserves the audit trail structure but clears all data.
    """
    engine = get_sync_engine()

    with engine.begin() as conn:
        # Order matters due to foreign keys
        conn.execute(text("DELETE FROM sent_emails"))
        conn.execute(text("DELETE FROM purchase_orders"))
        # Audit events: we need to drop and recreate triggers to allow DELETE
        conn.execute(text("DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_events"))
        conn.execute(text("DELETE FROM audit_events"))
        conn.execute(text("""
            CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_events
                FOR EACH ROW EXECUTE FUNCTION audit_events_immutable()
        """))
        conn.execute(text("DELETE FROM approval_requests"))
        conn.execute(text("DELETE FROM draft_actions"))
        conn.execute(text("DELETE FROM signals"))
        conn.execute(text("DELETE FROM runs"))
        conn.execute(text("DELETE FROM store_stock"))
        conn.execute(text("DELETE FROM warehouse_stock"))
        conn.execute(text("DELETE FROM skus"))
        conn.execute(text("DELETE FROM suppliers"))
        conn.execute(text("DELETE FROM stores"))
        conn.execute(text("DELETE FROM approvers"))

    print("[CLEARED] All data cleared.")
    seed()
    print("[OK] Demo reset complete.")


if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        reset()
    else:
        seed()

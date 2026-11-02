-- =============================================================================
-- Veyronica — Seed Data SQL Snapshot
-- Plan B: Run this directly against any Postgres to restore demo state.
-- Usage: psql $DATABASE_URL < scripts/seed.sql
-- =============================================================================

-- Approvers (Section 4.5)
INSERT INTO approvers (approver_id, name, role, store_id) VALUES
    ('APR-SM-214', 'Priya Sharma',    'store_manager',    'STORE-214'),
    ('APR-SM-087', 'Rakesh Verma',    'store_manager',    'STORE-087'),
    ('APR-RM-001', 'Anita Deshmukh',  'regional_manager', NULL)
ON CONFLICT (approver_id) DO NOTHING;

-- Stores
INSERT INTO stores (store_id, name, monthly_budget, budget_spent) VALUES
    ('STORE-214', 'V-Mart Lucknow Gomtinagar',  150000, 90000),
    ('STORE-087', 'V-Mart Jaipur Vaishali',     100000, 30000),
    ('STORE-312', 'V-Mart Patna Boring Road',    80000, 70000)
ON CONFLICT (store_id) DO NOTHING;

-- Suppliers
INSERT INTO suppliers (supplier_id, name, approved, credit_limit, credit_outstanding, email) VALUES
    ('SUP-1042', 'Supplier A', TRUE,  300000, 180000, 'supplier-a@example.com'),
    ('SUP-2087', 'Supplier B', TRUE,  200000,  90000, 'supplier-b@example.com'),
    ('SUP-3011', 'Supplier C', TRUE,  250000, 240000, 'supplier-c@example.com'),
    ('SUP-4055', 'Supplier D', FALSE, 100000,  20000, 'supplier-d@example.com')
ON CONFLICT (supplier_id) DO NOTHING;

-- SKU Master (12 SKUs)
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
ON CONFLICT (sku) DO NOTHING;

-- Warehouse Stock
INSERT INTO warehouse_stock (sku, quantity) VALUES
    ('SKU-8821', 500), ('SKU-7732', 400), ('SKU-9015', 300),
    ('SKU-4410', 800), ('SKU-4502', 350), ('SKU-4618', 300),
    ('SKU-3301', 400), ('SKU-3355', 250), ('SKU-3402', 100),
    ('SKU-6120', 600), ('SKU-6188', 450), ('SKU-6240', 500)
ON CONFLICT (sku) DO NOTHING;

-- Store Stock (36 rows: 3 stores × 12 SKUs)
INSERT INTO store_stock (store_id, sku, current_stock, sales_velocity_7d) VALUES
    -- STORE-214: Hero scenario
    ('STORE-214', 'SKU-8821', 24, 6.0),
    ('STORE-214', 'SKU-7732', 12, 3.0),
    ('STORE-214', 'SKU-9015',  8, 2.0),
    ('STORE-214', 'SKU-4410', 80, 2.0),
    ('STORE-214', 'SKU-4502', 50, 1.5),
    ('STORE-214', 'SKU-4618', 45, 1.0),
    ('STORE-214', 'SKU-3301', 70, 2.0),
    ('STORE-214', 'SKU-3355', 40, 1.0),
    ('STORE-214', 'SKU-3402', 15, 0.5),
    ('STORE-214', 'SKU-6120', 60, 2.0),
    ('STORE-214', 'SKU-6188', 50, 1.5),
    ('STORE-214', 'SKU-6240', 55, 1.0),
    -- STORE-087: Auto-approve scenario
    ('STORE-087', 'SKU-4410', 10, 4.0),
    ('STORE-087', 'SKU-4502', 55, 1.0),
    ('STORE-087', 'SKU-4618', 40, 1.0),
    ('STORE-087', 'SKU-8821', 60, 2.0),
    ('STORE-087', 'SKU-7732', 50, 1.5),
    ('STORE-087', 'SKU-9015', 45, 1.0),
    ('STORE-087', 'SKU-3301', 55, 1.5),
    ('STORE-087', 'SKU-3355', 35, 0.8),
    ('STORE-087', 'SKU-3402', 12, 0.3),
    ('STORE-087', 'SKU-6120', 65, 2.0),
    ('STORE-087', 'SKU-6188', 48, 1.0),
    ('STORE-087', 'SKU-6240', 50, 1.0),
    -- STORE-312: Regional Manager scenario
    ('STORE-312', 'SKU-8821', 10, 5.0),
    ('STORE-312', 'SKU-7732',  5, 4.0),
    ('STORE-312', 'SKU-9015',  3, 3.0),
    ('STORE-312', 'SKU-4410', 15, 3.0),
    ('STORE-312', 'SKU-4502', 50, 1.5),
    ('STORE-312', 'SKU-4618', 40, 1.0),
    ('STORE-312', 'SKU-3301', 10, 3.0),
    ('STORE-312', 'SKU-3355',  8, 2.0),
    ('STORE-312', 'SKU-3402',  5, 1.0),
    ('STORE-312', 'SKU-6120', 12, 4.0),
    ('STORE-312', 'SKU-6188', 10, 3.0),
    ('STORE-312', 'SKU-6240',  8, 2.0)
ON CONFLICT (store_id, sku) DO UPDATE SET
    current_stock = EXCLUDED.current_stock,
    sales_velocity_7d = EXCLUDED.sales_velocity_7d;

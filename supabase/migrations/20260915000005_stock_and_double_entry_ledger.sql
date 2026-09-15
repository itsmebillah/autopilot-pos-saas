-- 1. Immutable Double-Entry Stock Movement Ledger
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL, -- 'SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGE'
    quantity NUMERIC(12,2) NOT NULL, -- Positive for stock added, negative for stock removed
    previous_stock NUMERIC(12,2) NOT NULL,
    new_stock NUMERIC(12,2) NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    reference_id UUID, -- Links to sale_id or purchase_id
    reference_type VARCHAR(50), -- 'SALE', 'PURCHASE_ORDER', 'INVENTORY_ADJUSTMENT'
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_store_product ON stock_movements(store_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, reference_type);

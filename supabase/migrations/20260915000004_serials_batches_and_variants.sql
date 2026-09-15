-- 1. Product Master Variants (Matrix Variants e.g. Size x Color)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    variant_attributes JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"size": "XL", "color": "Navy"}
    default_buy_price NUMERIC(12,2),
    default_sell_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Store-Level Product Variant Operational Config
CREATE TABLE IF NOT EXISTS store_product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    sell_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, variant_id)
);

-- 3. Product Serials / IMEIs (Item-Level Identity)
CREATE TABLE IF NOT EXISTS product_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    imei_2 VARCHAR(100),
    warranty_months INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK', -- 'IN_STOCK', 'SOLD', 'RETURNED', 'DEFECTIVE'
    sale_id UUID, -- Foreign key to sales(id) added in migration 07 or deferred
    warranty_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_product_serials_lookup ON product_serials(store_id, serial_number, status);

-- 4. Product Batches (Expiry & Lot Tracking)
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(store_id, product_id, expiry_date);

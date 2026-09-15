-- 1. Master Categories (Organization Level)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 2. Master Product Catalog (Organization Level)
CREATE TABLE IF NOT EXISTS master_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    master_sku VARCHAR(100),
    master_barcode VARCHAR(100),
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs', -- 'pcs', 'kg', 'gm', 'ltr', 'box', 'set'
    default_buy_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    default_sell_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5,2) DEFAULT NULL,
    min_stock_alert NUMERIC(12,2) NOT NULL DEFAULT 5.00,
    dynamic_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    has_variants BOOLEAN NOT NULL DEFAULT FALSE,
    has_serials BOOLEAN NOT NULL DEFAULT FALSE,
    has_batches BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, master_barcode),
    UNIQUE(organization_id, master_sku)
);

CREATE INDEX IF NOT EXISTS idx_master_products_dynamic_attrs ON master_products USING GIN (dynamic_attributes);
CREATE INDEX IF NOT EXISTS idx_master_products_org_name ON master_products(organization_id, name);

-- 3. Store-Level Product Operational Configuration (Store Level)
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
    store_sku VARCHAR(100),
    store_barcode VARCHAR(100),
    sell_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 5.00,
    tax_rate_override NUMERIC(5,2),
    is_available_for_sale BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_products_store_barcode ON store_products(store_id, store_barcode);
CREATE INDEX IF NOT EXISTS idx_store_products_store_sku ON store_products(store_id, store_sku);

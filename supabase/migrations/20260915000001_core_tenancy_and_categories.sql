-- 1. Master System Taxonomy: Shop Categories
CREATE TABLE IF NOT EXISTS shop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) UNIQUE NOT NULL, -- 'WATCHES', 'ELECTRONICS', 'MOBILE', 'COSMETICS', 'FASHION', 'GROCERY', 'HARDWARE', 'JEWELRY', 'GENERAL'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Organizations / Businesses (Tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    plan_tier VARCHAR(50) NOT NULL DEFAULT 'tier_starter', -- 'tier_free', 'tier_starter', 'tier_pro', 'tier_enterprise'
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'trialing', 'active', 'past_due', 'canceled', 'suspended'
    billing_provider VARCHAR(50) DEFAULT 'manual', -- 'stripe', 'paddle', 'sslcommerz', 'bkash', 'manual'
    billing_customer_id VARCHAR(255),
    subscription_id VARCHAR(255),
    current_period_end TIMESTAMPTZ,
    max_stores INT NOT NULL DEFAULT 1,
    max_users INT NOT NULL DEFAULT 3,
    max_products INT NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Stores / Outlets (Physical or Operational Nodes)
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    shop_category_id UUID NOT NULL REFERENCES shop_categories(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL, -- e.g. 'STR-01', 'DXB-01'
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '৳',
    currency_position VARCHAR(10) NOT NULL DEFAULT 'BEFORE', -- 'BEFORE' ($100) or 'AFTER' (100 ৳)
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Dhaka',
    locale VARCHAR(20) NOT NULL DEFAULT 'en-US',
    date_format VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD',
    number_format VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    tax_mode VARCHAR(20) NOT NULL DEFAULT 'TAX_EXCLUSIVE', -- 'TAX_EXCLUSIVE' or 'TAX_INCLUSIVE'
    tax_label VARCHAR(50) NOT NULL DEFAULT 'VAT',
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    tax_number VARCHAR(100),
    receipt_header TEXT,
    receipt_footer TEXT DEFAULT 'Thank you for shopping with us!',
    receipt_template VARCHAR(50) NOT NULL DEFAULT 'thermal_80mm', -- 'thermal_58mm', 'thermal_80mm', 'invoice_a4'
    logo_url TEXT,
    enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- 4. Shop Attribute Definitions (Category & Store Custom Attribute Schemas)
CREATE TABLE IF NOT EXISTS shop_attribute_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL DEFAULT 'text', -- 'text', 'number', 'select', 'date', 'boolean'
    options JSONB DEFAULT '[]'::jsonb, -- ['Option A', 'Option B']
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    show_in_pos BOOLEAN NOT NULL DEFAULT TRUE,
    show_on_receipt BOOLEAN NOT NULL DEFAULT TRUE,
    is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, name)
);

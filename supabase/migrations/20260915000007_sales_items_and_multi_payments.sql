-- 1. Sales Orders Table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    cashier_id UUID NOT NULL REFERENCES auth.users(id),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    invoice_no VARCHAR(100) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL,
    change_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_profit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'DUE', 'REFUNDED'
    sale_status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'VOIDED', 'RETURNED'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, invoice_no)
);

-- Defensive reconciliation for existing sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_profit NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PAID';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_status VARCHAR(50) DEFAULT 'COMPLETED';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Safely backfill financial fields for legacy prototype sales records
UPDATE sales
SET paid_amount = COALESCE(total, 0),
    discount_amount = COALESCE(discount, 0),
    tax_amount = COALESCE(tax, 0)
WHERE paid_amount = 0 AND total > 0;

CREATE INDEX IF NOT EXISTS idx_sales_store_created ON sales(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

-- 2. Sale Line Items Table
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    serial_numbers JSONB DEFAULT '[]'::jsonb, -- Array of serialized strings
    batch_number VARCHAR(100),
    unit_price NUMERIC(12,2) NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL,
    profit NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Defensive reconciliation for existing sale_items table
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS serial_numbers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS profit NUMERIC(12,2) DEFAULT 0.00;

-- Safely backfill line items monetary fields
UPDATE sale_items
SET unit_price = COALESCE(price, 0),
    unit_cost = COALESCE(cost, 0),
    subtotal = COALESCE(price * quantity, 0),
    total = COALESCE(price * quantity, 0)
WHERE unit_price = 0 AND price > 0;

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- 3. Multi-Payment Tender Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'CARD', 'BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER', 'STORE_CREDIT'
    amount NUMERIC(12,2) NOT NULL,
    transaction_ref VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);

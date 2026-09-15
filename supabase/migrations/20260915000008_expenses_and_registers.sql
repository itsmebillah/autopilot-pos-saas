-- 1. Operational Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'Rent', 'Utilities', 'Salary', 'Maintenance', 'Packaging', 'Other'
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON expenses(store_id, expense_date DESC);

-- 2. Cash Register Shifts (X/Z Reports & Cash Reconciliation)
CREATE TABLE IF NOT EXISTS cash_register_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    cashier_id UUID NOT NULL REFERENCES auth.users(id),
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_closing_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_closing_cash NUMERIC(12,2),
    cash_discrepancy NUMERIC(12,2) DEFAULT 0.00,
    total_sales_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_refunds_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_register_shifts_store ON cash_register_shifts(store_id, opened_at DESC);

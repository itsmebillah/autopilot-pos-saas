-- Migration 20260915000012_settings_and_invoice_configuration.sql
-- Safely version-controls the settings table and all invoice/receipt configuration fields

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT DEFAULT 'Autopilot POS Store',
    phone TEXT,
    address TEXT,
    currency TEXT DEFAULT '৳',
    logo_url TEXT,
    email VARCHAR(255),
    website VARCHAR(255),
    tax_number VARCHAR(100),
    tax_label VARCHAR(50) DEFAULT 'VAT',
    tax_rate NUMERIC(5,2) DEFAULT 0,
    currency_code VARCHAR(10) DEFAULT 'BDT',
    currency_position VARCHAR(10) DEFAULT 'BEFORE',
    receipt_footer TEXT DEFAULT 'Thank you for shopping with us! Please come again.',
    return_policy TEXT DEFAULT 'Exchange available within 7 days with original invoice.',
    receipt_template VARCHAR(50) DEFAULT 'thermal_80mm',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist for existing installations
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT 'Autopilot POS Store';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '৳';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100);
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tax_label VARCHAR(50) DEFAULT 'VAT';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'BDT';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS currency_position VARCHAR(10) DEFAULT 'BEFORE';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'Thank you for shopping with us! Please come again.';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS return_policy TEXT DEFAULT 'Exchange available within 7 days with original invoice.';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS receipt_template VARCHAR(50) DEFAULT 'thermal_80mm';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow reading settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Public can view settings'
    ) THEN
        CREATE POLICY "Public can view settings" ON public.settings
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Admins can update settings'
    ) THEN
        CREATE POLICY "Admins can update settings" ON public.settings
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Migration: 20260915000013_product_cost_structure.sql
-- Description: Implement Product Cost Structure (Purchase Cost, Additional Cost & Landed Cost) with zero breaking changes

-- 1. Upgrade public.products (legacy active table)
ALTER TABLE IF EXISTS public.products 
    ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(15,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS additional_cost NUMERIC(15,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;

-- Safe backward-compatible backfill for products
UPDATE public.products 
SET 
    purchase_cost = COALESCE(buy_price, 0.00),
    additional_cost = 0.00,
    cost_breakdown = '{}'::jsonb
WHERE (purchase_cost IS NULL OR purchase_cost = 0.00) AND COALESCE(buy_price, 0.00) > 0.00;

-- 2. Upgrade master_products (multi-tenant catalog)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_products') THEN
        ALTER TABLE public.master_products 
            ADD COLUMN IF NOT EXISTS default_purchase_cost NUMERIC(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS default_additional_cost NUMERIC(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;

        UPDATE public.master_products 
        SET 
            default_purchase_cost = COALESCE(default_buy_price, 0.00),
            default_additional_cost = 0.00,
            cost_breakdown = '{}'::jsonb
        WHERE (default_purchase_cost IS NULL OR default_purchase_cost = 0.00) AND COALESCE(default_buy_price, 0.00) > 0.00;
    END IF;
END $$;

-- 3. Upgrade store_products (store outlet pricing)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_products') THEN
        ALTER TABLE public.store_products 
            ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS additional_cost NUMERIC(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;

        UPDATE public.store_products 
        SET 
            purchase_cost = COALESCE(cost_price, 0.00),
            additional_cost = 0.00,
            cost_breakdown = '{}'::jsonb
        WHERE (purchase_cost IS NULL OR purchase_cost = 0.00) AND COALESCE(cost_price, 0.00) > 0.00;
    END IF;
END $$;

-- 4. Upgrade sale_items (for granular historical cost auditing)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sale_items') THEN
        ALTER TABLE public.sale_items 
            ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(12,2) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS additional_cost NUMERIC(12,2) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;

        UPDATE public.sale_items 
        SET 
            purchase_cost = COALESCE(unit_cost, cost, 0.00),
            additional_cost = 0.00
        WHERE purchase_cost IS NULL AND COALESCE(unit_cost, cost, 0.00) > 0.00;
    END IF;
END $$;

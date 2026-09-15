# Autopilot POS SaaS — Phase 1: Database Schema, Migrations & Core Architecture

**Document Version:** 1.0.0  
**Phase:** 1 — Foundation & Database Layer  
**Date:** September 15, 2026  
**Status:** In Execution  

---

## 1. Objectives of Phase 1
1. **Version-Controlled Migrations:** Establish reproducible database migrations under `supabase/migrations/` using the Supabase CLI.
2. **Universal Tenancy Schema:** Implement the three-tier hierarchy:
   $$\text{Platform} \rightarrow \text{Organization (Business)} \rightarrow \text{Store (Outlet)} \rightarrow \text{Staff Members}$$
3. **Master Taxonomy & Presets:** Seed 8 default `shop_categories` (*Watches, Electronics, Mobile & Accessories, Cosmetics, Fashion, Grocery, Hardware, General Retail*) with default dynamic attribute definitions and enabled module presets.
4. **Product Catalog Separation:**
   - Organization-level `master_products` (catalog identity, brand, model, dynamic JSONB attributes, SKU, barcode).
   - Store-level `store_products` (local sell price, cost price, current stock, reorder level, tax override, availability).
5. **Specialized Domain Sub-Tables:**
   - `product_variants` & `store_product_variants` (Matrix Size $\times$ Color variants).
   - `product_serials` (Item-level serial number, dual IMEI, warranty tracking).
   - `product_batches` (Manufacturing date, expiry date, lot cost, stock).
6. **Double-Entry Stock Ledger:** `stock_movements` tracking every physical inventory addition, reduction, transfer, damage, and audit.
7. **CRM & Sales Operations:** `customers` (with credit balance / dues), `suppliers` (with payables), `sales`, `sale_items`, `payments`, and `expenses`.
8. **Row Level Security (RLS):** 100% table coverage ensuring multi-tenant isolation.
9. **Atomic Checkout Engine:** `create_sale_atomic` PostgreSQL stored procedure with pessimistic row locking (`SELECT FOR UPDATE`), server pricing verification, serial state update, batch depletion, and customer due logging.

---

## 2. Migration Files Plan

| Sequence | Migration File Name | Target Contents |
|---|---|---|
| **01** | `20260915000001_core_tenancy_and_categories.sql` | `shop_categories`, `organizations`, `stores`, `shop_attribute_definitions`. |
| **02** | `20260915000002_users_profiles_and_rbac.sql` | `user_profiles`, `organization_members`, `store_members`, and RLS helper functions (`is_platform_super_admin`, `user_has_store_access`). |
| **03** | `20260915000003_master_catalog_and_store_products.sql` | `categories`, `master_products`, `store_products`, GIN index on `dynamic_attributes`. |
| **04** | `20260915000004_serials_batches_and_variants.sql` | `product_variants`, `store_product_variants`, `product_serials`, `product_batches`. |
| **05** | `20260915000005_stock_and_double_entry_ledger.sql` | `stock_movements` table, movement types, triggers. |
| **06** | `20260915000006_crm_customers_and_suppliers.sql` | `customers`, `suppliers`, customer balance tracking. |
| **07** | `20260915000007_sales_items_and_multi_payments.sql` | `sales`, `sale_items`, `payments`, `expenses`. |
| **08** | `20260915000008_rls_security_policies.sql` | Comprehensive RLS policies on all tables. |
| **09** | `20260915000009_atomic_checkout_rpc.sql` | PostgreSQL stored procedure `create_sale_atomic`. |
| **10** | `20260915000010_seed_master_categories.sql` | Default seed data for 8 shop categories with attribute definitions and module presets. |

---

## 3. Atomic Stored Procedure Specification (`create_sale_atomic`)

```sql
CREATE OR REPLACE FUNCTION create_sale_atomic(
    p_organization_id UUID,
    p_store_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_discount_amount NUMERIC,
    p_items JSONB, -- [{ product_id, variant_id, quantity, serial_numbers, batch_number }]
    p_payments JSONB, -- [{ payment_method, amount, transaction_ref }]
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB ...
```

---

## 4. Verification & Validation Plan
1. **SQL Syntax & Migration Integrity:** Generate migrations and verify SQL compilation.
2. **TypeScript Database Types:** Generate or craft complete typed database interfaces in `types/database.ts`.
3. **Vitest Unit Test Suite:** Test cart pricing calculation, discount logic, tax calculation, and atomic RPC payload construction.
4. **Build & Lint Verification:** Ensure `npx tsc --noEmit` and `npm run lint` are validated.
5. **Git Commit & Push:** Commit Phase 1 milestones cleanly to `main`.

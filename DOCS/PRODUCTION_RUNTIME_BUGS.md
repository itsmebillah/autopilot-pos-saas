# Autopilot POS SaaS — Production Runtime Bug Inventory

**Document ID:** `DOCS/PRODUCTION_RUNTIME_BUGS.md`  
**Date:** September 15, 2026  
**Auditor:** Antigravity AI Engine  
**Target Repository:** `itsmebillah/autopilot-pos-saas`  
**Target Supabase Project:** `dhgfevlwiwcblobpxjca`  

---

## 1. Bug Inventory Matrix

| Bug ID | Issue Description | Location | Severity | Root Cause | Fix Applied | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **BUG-001** | `Invalid API key` on mobile product creation & API routes | Vercel Environment / `lib/supabase.ts` | **Critical** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` were completely unconfigured on Vercel. `lib/supabase.ts` fell back to `"placeholder-anon-key"`, triggering 401 Unauthorized errors from Supabase PostgREST. | Configured all 3 required environment variables on Vercel across `Production`, `Preview`, and `Development` scopes, and created local `.env.local`. Enhanced `lib/supabase.ts` with warning guards. | ✅ **FIXED & VERIFIED** |
| **BUG-002** | Silent product overwriting & unhandled `single()` query errors | `app/api/products/route.ts` | **High** | Calling `.single()` on product name query threw `PGRST116` error when product did not exist, or silently updated existing products without audit tracking. | Rewrote product creation with explicit existence checks, clear error messages, and auditable creation flow. | ✅ **FIXED & VERIFIED** |
| **BUG-003** | Missing barcode collision validation on product create/update | `app/api/products/route.ts`, `app/api/products/update/route.ts` | **High** | Entering an existing barcode allowed duplicate barcode assignments in the database, breaking POS single-product scanning lookups. | Added pre-insert/pre-update collision validation returning HTTP `409 Conflict` with the conflicting product name. | ✅ **FIXED & VERIFIED** |
| **BUG-004** | Lack of negative number input guards | `app/api/products/route.ts`, `app/api/products/update/route.ts` | **Medium** | Negative sell prices, buy prices, or stock numbers were not sanitized on the server before database insertion. | Added strict server-side validation enforcing non-negative values for all monetary and quantity fields. | ✅ **FIXED & VERIFIED** |
| **BUG-005** | Ambiguous Supabase client architecture | `lib/supabase.ts` | **Medium** | Single public client exported without separation of public browser context vs server-only privileged operations. | Added `getServerSupabaseAdmin()` for secure server execution with `SUPABASE_SERVICE_ROLE_KEY`. | ✅ **FIXED & VERIFIED** |
| **BUG-006** | Unhandled promise exceptions in Dashboard & Reports | `app/api/dashboard/route.ts`, `app/api/reports/route.ts` | **Low** | Sequential database queries could crash route execution if any single table was empty or slow. | Refactored with `Promise.all` parallel querying, fallback default objects, and structured try/catch blocks. | ✅ **FIXED & VERIFIED** |
| **BUG-007** | Checkout payment state desynchronization & hardcoded quick cash presets | `components/CheckoutModal.tsx`, `lib/quick-cash.ts` | **High** | Preset click buttons did not update the input element, creating split state where preset, tender input, summary paid, and change/due displayed mutually conflicting numbers (e.g. payable 2120 with presets 21,000, 22,000, input 5000, summary paid 25,000, change 24,880). | Created canonical `lib/quick-cash.ts` with adaptive denomination rounding algorithm, synchronized tender state across input and calculation engine, and non-overlapping change/due badges. | ✅ **FIXED & VERIFIED** |
| **BUG-008** | Prototype plaintext authentication & lack of route/API authorization guards | `app/api/login/route.ts`, `lib/supabase.ts`, all API routes | **Critical** | Prototype login checked plaintext password directly against legacy `users` table without session cookies, JWT verification, route middleware, or API RBAC authorization. | Replaced with `@supabase/ssr` Supabase Auth, HTTP-only session cookies, Next.js route protection middleware, `user_profiles`, `organization_members` & `store_members` multi-tenant RBAC, and server-authoritative API guards. | ✅ **FIXED & VERIFIED** |
| **BUG-009** | BDT currency symbol `৳` rendering corruption & monospace font collision in invoice PDF/receipts | `lib/invoice-engine.ts`, `components/InvoiceReceipt.tsx` | **High** | Absence of spacing between symbol and numeric digits in `formatCurrency` (`৳2,500.00`) combined with monospace fonts lacking Bengali Unicode glyphs caused visual glyph distortion (appearing like `22,500.00` or `2`). | Refactored `formatCurrency` with explicit symbol-digit spacing (`৳ 2,500.00` / `2,500.00 ৳`), updated font stack with native Unicode fallbacks and `tabular-nums`, and de-duplicated store/business receipt headers. | ✅ **FIXED & VERIFIED** |



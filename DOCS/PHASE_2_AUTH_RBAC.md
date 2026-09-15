# Phase 2 — Production Authentication, Session & RBAC Architecture

**Document ID:** `DOCS/PHASE_2_AUTH_RBAC.md`  
**Date:** September 15, 2026  
**Auditor:** Antigravity AI Engine  
**Target Repository:** `itsmebillah/autopilot-pos-saas`  
**Target Supabase Project:** `dhgfevlwiwcblobpxjca`  
**Status:** ✅ **PRODUCTION READY & VERIFIED**

---

## 1. Executive Summary

In Phase 2, the prototype plaintext authentication mechanism (direct querying of the legacy `users` table) was permanently decommissioned and replaced with production-grade Supabase Auth SSR, secure cookie sessions, user profile mapping, organization & store multi-tenant RBAC, server-side route protection, and API authorization guards.

---

## 2. Authentication Architecture

```
[ Browser / Client ]
  │
  ├──► [ Next.js Middleware (middleware.ts) ]
  │      ├── Validates & refreshes session cookies with @supabase/ssr
  │      ├── Unauthenticated /dashboard/* ──► Redirects to /
  │      └── Authenticated / ──► Redirects to /dashboard
  │
  ├──► [ Client React Context (lib/auth-context.tsx) ]
  │      ├── useAuth() hook provides session state, profile, and tenant metadata
  │      ├── Supabase Browser Client (lib/supabase-browser.ts)
  │      └── Handles instant signInWithPassword & global signOut
  │
  └──► [ Next.js Server & Route Handlers ]
         ├── createServerSupabaseClient() (lib/supabase-server.ts)
         ├── requireAuth() & requireRole() (lib/auth-guard.ts)
         └── Server-Authoritative Postgres RLS Isolation
```

---

## 3. RBAC & Authorization Matrix

| Action | Platform Super Admin | Owner | Manager | Cashier | Inventory / Staff |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Dashboard & KPI Metrics** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **POS Sales & Checkout** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **Reprint Invoices & Order History** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **Add / Edit Catalog Products** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied | ✅ Allowed |
| **Delete Products** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Adjust Inventory & Stock Levels** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied | ✅ Allowed |
| **Bulk Import Products from CSV** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied | ✅ Allowed |
| **View Financial Reports & Margins** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Modify Store Settings & Tax Config** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Upload Store Logo** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |

---

## 4. Multi-Tenant & Store Outlet Isolation

1. **Organization Isolation:**
   - Every user belongs to one or more organizations via `organization_members`.
   - APIs derive `organization_id` strictly from the server-authenticated session.
   - Postgres RLS prevents Organization A users from reading or mutating Organization B data.

2. **Store Outlet Isolation:**
   - Cashiers and staff are assigned to specific store outlets via `store_members`.
   - `requireStoreAccess(session, targetStoreId)` blocks access if a cashier attempts to ring up sales or query stock for an unassigned store outlet.
   - Owners and Managers retain organization-wide visibility across all assigned store outlets.

---

## 5. Legacy User Migration Strategy

- The prototype `users` table with plaintext password comparison is **quarantined and inactive**.
- Existing administrator account `admin@autopilotpos.com` was provisioned directly into Supabase Auth (`auth.users`) via cryptographic hashing.
- Corresponding relational entities were created:
  - `user_profiles` (`id = 5b7b2034-517a-4a36-ad82-504f76f4eb5c`, `is_super_admin = true`).
  - `organization_members` (`role = 'owner'`, `is_active = true`).
  - `store_members` linked to primary store outlet.

---

## 6. Automated Test Suite Verification

Vitest test suite (`tests/auth-rbac.test.ts` and related suites) validates 85 critical authorization and business logic scenarios:

```bash
$ npm test
✓ tests/inventory-ledger.test.ts (4 tests)
✓ tests/rls-isolation.test.ts (6 tests)
✓ tests/atomic-checkout.test.ts (10 tests)
✓ tests/quick-cash.test.ts (10 tests)
✓ tests/pos-engine.test.ts (10 tests)
✓ tests/barcode-engine.test.ts (5 tests)
✓ tests/product-costing.test.ts (13 tests)
✓ tests/bulk-import.test.ts (6 tests)
✓ tests/invoice-engine.test.ts (9 tests)
✓ tests/auth-rbac.test.ts (12 tests)

Test Files  10 passed (10)
     Tests  85 passed (85)
```

---

## 7. Multi-Shop Switching & Server Context

- `POST /api/auth/switch-store` authorizes store switches strictly against the user's `session.accessibleStores`.
- Unassigned store switch attempts return `403 Forbidden`.
- Successful store switch sets the `pos_active_store_id` cookie and triggers an immediate refresh to prevent stale cache leakage.

---

## 8. Production Build & Deployment Verification

- `npx tsc --noEmit`: **0 errors**
- `npm run lint`: **0 errors**
- `npm run build`: **Compiled successfully**
- Production URL: `https://autopilot-pos-saas.vercel.app`
- Verification Document: `DOCS/PHASE_2_FINAL_MULTI_SHOP_VERIFICATION.md`

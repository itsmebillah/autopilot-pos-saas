# Platform Admin Dashboard & Shop Onboarding Architecture

**Document ID:** `DOCS/PLATFORM_ADMIN_AND_SHOP_ONBOARDING.md`  
**Date:** September 15, 2026  
**Auditor:** Antigravity AI Engine  
**Target Repository:** `itsmebillah/autopilot-pos-saas`  
**Target Supabase Project:** `dhgfevlwiwcblobpxjca`  
**Target Deployment:** `https://autopilot-pos-saas.vercel.app`  
**Status:** ✅ **PLATFORM ADMIN + SHOP ONBOARDING READY**

---

## 1. Executive Summary

This document describes the dedicated **Platform Admin Dashboard** and **Tenant Onboarding Subsystem** for Autopilot POS Universal Retail SaaS.

The platform owner (Master Admin) can provision new businesses, manage multi-outlet store hierarchies, configure industry taxonomy categories, assign initial shop administrators, and enforce tenant operational lifecycles (activation and suspension).

---

## 2. Master Admin Provisioning & Security Architecture

### 2.1 Initial Master Admin
- **Designated Account:** `williammasum@gmail.com`
- **Database Trigger:** `set_master_admin_super_flag` automatically enforces `is_super_admin = TRUE` upon profile creation/update via PostgreSQL trigger with `SECURITY DEFINER`.
- **Zero Frontend Trust:** Authorization is strictly derived from the server-authenticated session and verified database record:
  ```
  Supabase Auth Session (auth.users)
          │
          ▼
  user_profiles.is_super_admin === true
          │
          ▼
  requireSuperAdmin(session) Guard (lib/auth-guard.ts)
  ```
  No frontend email comparisons or client-supplied boolean flags are trusted.

### 2.2 Server-Authoritative Guard (`lib/auth-guard.ts`)
```typescript
export function requireSuperAdmin(session: AuthenticatedSession) {
  if (!session.profile.isSuperAdmin) {
    const error = new Error("Forbidden — Platform Super Admin privileges required");
    (error as any).status = 403;
    throw error;
  }
}
```

---

## 3. Platform Admin Dashboard (`/admin`)

The Platform Admin Console operates on a dedicated route `/admin` with a distinctive SaaS master admin interface:

### 3.1 Global Summary Metrics
- **Total Organizations:** Registered business entities.
- **Total Shops:** Physical / operational store outlets.
- **Active Shops:** Operational stores with active status.
- **Suspended Shops:** Outlets locked from POS and business mutations.
- **Total Users:** Aggregate platform staff, cashiers, and administrators.
- **Shop Categories:** Configured master retail taxonomies.

### 3.2 Businesses & Outlets Management View
- Search by business name, store name, admin contact, or category.
- Filter by status (`Active` / `Suspended`).
- Actions:
  - **View Details** (`/admin/shops/[id]`)
  - **+ Add Outlet** (Instant additional branch modal)
  - **Suspend / Activate** (Instant status toggle)

---

## 4. Multi-Step Shop Onboarding Wizard

The onboarding flow runs atomically server-side via `POST /api/admin/organizations`:

```
[ Step 1: Business Information ]
  ├── Business Name *
  ├── Legal Entity Name
  ├── Phone, Email, Website, Address
  └── Currency, Currency Symbol, Timezone, Locale

        │
        ▼

[ Step 2: Shop Information & Category Preset ]
  ├── Store / Outlet Name *
  ├── Store Code (e.g. STR-A9F2)
  ├── Category Selection (from shop_categories)
  └── Live Taxonomy Preset Preview:
        ├── Custom Attribute Schemas (e.g. Serial, IMEI, Warranty, Batch, Expiry, Shade)
        └── Enabled POS Modules (mod_serial_imei, mod_warranty, mod_batch, etc.)

        │
        ▼

[ Step 3: Initial Shop Admin ]
  ├── Admin Full Name *
  ├── Admin Email Address *
  ├── Admin Phone Number
  └── Role: OWNER / SHOP ADMIN (Immutable)

        │
        ▼

[ Atomic Server-Side Provisioning Transaction ]
  1. Insert into organizations (generates unique slug)
  2. Insert into stores (links shop_category_id, timezone, currency)
  3. Copy category default_attributes into shop_attribute_definitions
  4. Create or link auth user in auth.users (email auto-confirmed)
  5. Upsert user_profiles (is_super_admin = false)
  6. Insert into organization_members (role = 'owner', is_active = true)
  7. Insert into store_members (store_id, user_id)
  8. Return 201 Created & New Tenant Identifiers
```

---

## 5. Multi-Store / Outlet Architecture

For existing organizations, the Master Admin can create multiple branch outlets:

```
Organization: ABC Electronics Ltd. (Org ID: org-abc)
    ├── Store 1: Dhaka Branch (Code: DHK-01) — Category: ELECTRONICS
    ├── Store 2: Chittagong Branch (Code: CTG-01) — Category: ELECTRONICS
    └── Store 3: Sylhet Branch (Code: SYL-01) — Category: ELECTRONICS
```

- Each store maintains isolated product stock levels, POS sessions, and staff assignments.
- Organization owners retain visibility across all stores within their organization.

---

## 6. Shop & Store Suspension Lifecycle

- **Store Suspension:** Setting `is_active = false` locks the store outlet.
- **Organization Suspension:** Setting `subscription_status = 'suspended'` suspends all store outlets and operations across the entire business.

---

## 7. Automated Test Suite

All 94 unit, RBAC, and platform admin tests pass:

```bash
$ npm test

✓ tests/rls-isolation.test.ts (6 tests)
✓ tests/inventory-ledger.test.ts (4 tests)
✓ tests/quick-cash.test.ts (10 tests)
✓ tests/invoice-engine.test.ts (9 tests)
✓ tests/barcode-engine.test.ts (5 tests)
✓ tests/atomic-checkout.test.ts (10 tests)
✓ tests/product-costing.test.ts (13 tests)
✓ tests/bulk-import.test.ts (6 tests)
✓ tests/pos-engine.test.ts (10 tests)
✓ tests/platform-admin.test.ts (9 tests)
✓ tests/auth-rbac.test.ts (12 tests)

Test Files  11 passed (11)
     Tests  94 passed (94)
```

---

## 8. Build & Verification Sign-Off

```bash
$ npx tsc --noEmit     # 0 errors
$ npm run lint         # 0 errors
$ npm run build        # Compiled successfully
```

### Final Declaration
> **✅ PLATFORM ADMIN + SHOP ONBOARDING READY**  
> Master Admin dashboard, super-admin security guard, atomic shop onboarding, multi-store architecture, and category preset configurations are fully production ready.

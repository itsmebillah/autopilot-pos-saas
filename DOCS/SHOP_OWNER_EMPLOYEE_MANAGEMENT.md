# Shop Owner & Employee User Management System

**Document ID:** `DOCS/SHOP_OWNER_EMPLOYEE_MANAGEMENT.md`  
**Date:** September 15, 2026  
**Auditor:** Antigravity AI Engine  
**Target Repository:** `itsmebillah/autopilot-pos-saas`  
**Target Supabase Project:** `dhgfevlwiwcblobpxjca`  
**Target Deployment:** `https://autopilot-pos-saas.vercel.app`  
**Status:** ✅ **SHOP OWNER + EMPLOYEE MANAGEMENT PRODUCTION READY**

---

## 1. Executive Summary

This document certifies the implementation and production verification of the multi-tenant **Shop Owner & Employee / Staff Management Subsystem** for Autopilot POS SaaS.

It defines the boundaries between the Platform Master Admin (`williammasum@gmail.com`), Shop Owners (e.g. `itsmbillah@gmail.com` for *Reyon Watch*), and retail staff employees (Managers, Cashiers / Sales Persons, Inventory Staff, Accountants).

---

## 2. Business & Role Hierarchy

```
[ Platform Master Admin / POS Owner ]
  └── williammasum@gmail.com (user_profiles.is_super_admin = TRUE)
        └── Global platform management, tenant creation, category configuration.

                    │
                    ▼

[ Shop Tenant: Reyon Watch (Org ID: 70202faa-6ac5-484f-ad14-b3562adf381a) ]
  ├── Shop Owner: itsmbillah@gmail.com (is_super_admin = FALSE, role = 'owner')
  │     ├── Full store operations, product management, store settings, sales reports.
  │     └── Team staff onboarding, role assignments, staff deactivation.
  │
  ├── Store Manager: (role = 'manager')
  │     ├── Store POS operations, inventory, stock adjustments, shift management.
  │     └── Cannot modify Owner accounts or access platform admin.
  │
  ├── Sales Person / Cashier: (role = 'cashier')
  │     ├── Barcode scanning, cart, payment checkout, customer dues, invoice reprint.
  │     └── Denied employee management, store settings, product deletion, financial reports.
  │
  ├── Inventory Staff: (role = 'inventory')
  │     ├── Stock intake, batch ledger adjustments, product additions.
  │     └── Denied POS checkout and administrative settings.
  │
  └── Accountant / Finance: (role = 'accountant')
        └── Sales financial margins, expenses, dues ledger, profit reports.
```

---

## 3. Permission-Driven RBAC Engine (`lib/permissions.ts`)

Authorization is enforced server-side using discrete capability keys:

| Permission Key | Shop Owner | Store Manager | Cashier / Sales | Inventory Staff | Accountant |
|---|:---:|:---:|:---:|:---:|:---:|
| `canManageEmployees` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canChangeEmployeeRole` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canDeactivateEmployee` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canAccessPOS` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canManageProducts` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `canDeleteProducts` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canManageInventory` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `canViewFinancialReports`| ✅ | ✅ | ❌ | ❌ | ✅ |
| `canManageSettings` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canManageShifts` | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 4. Employee Lifecycle & API Workflows

### 4.1 Employee Creation Flow (`POST /api/employees`)
1. Shop Owner submits Employee name, email, role, and assigned store outlet.
2. Server validates target `store_id` belongs strictly to `session.organization.id`.
3. Checks if user exists in `auth.users`; if not, creates auto-confirmed auth user.
4. Upserts `user_profiles` (`is_super_admin = false`).
5. Inserts into `organization_members` (`role = role`, `is_active = true`).
6. Inserts into `store_members` (`store_id = targetStoreId`).
7. Returns 200 OK. Zero plaintext passwords stored.

### 4.2 Deactivation Lifecycle
- Owner/Manager can toggle `is_active = false` via `PATCH /api/employees/[id]`.
- Primary Owner account cannot be deactivated.
- `lib/auth-guard.ts` intercepts deactivated employee memberships: `getAuthenticatedSession()` returns `null`, denying all subsequent protected API requests with `401/403`.

### 4.3 Password Setup Flow (`POST /api/employees/[id]/reset-password`)
- Uses Supabase Auth Admin recovery link generation (`auth.admin.generateLink`) so employees can safely set up their credentials without credentials exposure.

---

## 5. UI Customization & Tenant Scoping

- **Shop Management Section (`/dashboard/employees`):**
  - KPI summary metrics: Total, Active, Inactive, Sales Staff, Managers, Other Roles.
  - Interactive table & mobile card view with role badges, status toggles, and edit modals.
  - Navigation in `components/Sidebar.tsx` automatically displays `Employees` for Owners/Managers and hides management tabs for Cashiers.

---

## 6. Automated Test Results

```bash
$ npm test

✓ tests/rls-isolation.test.ts (6 tests)
✓ tests/invoice-engine.test.ts (9 tests)
✓ tests/inventory-ledger.test.ts (4 tests)
✓ tests/quick-cash.test.ts (10 tests)
✓ tests/barcode-engine.test.ts (5 tests)
✓ tests/product-costing.test.ts (13 tests)
✓ tests/bulk-import.test.ts (6 tests)
✓ tests/atomic-checkout.test.ts (10 tests)
✓ tests/pos-engine.test.ts (10 tests)
✓ tests/auth-rbac.test.ts (12 tests)
✓ tests/platform-admin.test.ts (9 tests)
✓ tests/employee-management.test.ts (15 tests)

Test Files  12 passed (12)
     Tests  109 passed (109)
```

---

## 7. Verification Sign-Off

```bash
$ npx tsc --noEmit     # Status: 0 errors
$ npm run lint         # Status: 0 errors
$ npm run build        # Status: 35 Next.js routes compiled successfully
```

### Final Acceptance Declaration
> **✅ SHOP OWNER + EMPLOYEE MANAGEMENT PRODUCTION READY**  
> All requirements for Reyon Watch ownership scoping, employee lifecycle, RBAC permissions matrix, cross-tenant isolation, and employee deactivation are fully production ready.

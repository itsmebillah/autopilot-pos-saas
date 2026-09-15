# Master Admin Control Center audit

Audit date: 2026-09-15. Sources: live Supabase REST schema and records, Auth directory, application routes and checked-in migrations.

## Navigation and tenant context

Platform Owner now lands on /admin. Server-protected navigation includes Platform Overview, Organizations, Shops, Shop Owners, Users, Payments & Subscriptions, Categories, Platform Settings and Support.

All six KPIs link to lists; Active and Suspended filter individual stores. /admin/shops/[id] now uses a store ID. Business details and Add Outlet moved to /admin/organizations/[id].

Shop cards and details include business, owner, owner Auth email, category, activation, plan, subscription state, created date, users and total business outlets. Staff management is reached through an explicitly selected shop console.

Open Shop Console validates the target on the server and sets an HttpOnly, Secure-in-production, SameSite=Lax context cookie for one hour. Platform mode has role platform_admin and no implicit tenant. Support mode retains the platform identity; it does not impersonate the owner. Return to Platform and sign-out clear support context.

Retail API guards reject platform sessions without an explicitly selected shop. Owners and staff require a verified active membership; missing tenant/store records no longer fall back to another tenant.

Category name/module defaults can be edited for future shops. Subscription plan, state and period-end metadata can be edited per business. Subscription suspension is enforced by the session guard.

## KPI definitions and findings

| KPI | Definition | Observed |
| --- | --- | ---: |
| Total Organizations | Unique organizations.id, including legacy, test and inactive records | 4 |
| Total Shops | Unique stores.id; one shop is one outlet | 2 |
| Active | Unique stores with is_active = true | 2 |
| Suspended | Unique stores with is_active = false | 0 |
| Total Users | Unique user_profiles.id, not memberships or legacy users | 3 |
| Categories | Unique platform shop_categories.id, not retail categories | 8 |

Shop activation is separate from organization subscription state. A store with its active flag set cannot enter its console if the business is suspended.

All three profiles match Auth IDs. There are three active organization memberships and one explicit store assignment. User counts are not inflated by membership counts. Query failures display errors rather than invented zeros. Reads are paginated beyond the default row limit.

Two organizations share the name Autopilot POS but have distinct IDs and no outlets. The UI flags them for review, not merging.

Tenant B - Apex Electronics is a test candidate; its slug is referenced in the existing authenticated-RLS script. It remains included. There is no reliable is_test or archival field, so no records were silently excluded or deleted.

There are two existing super-admin profiles, including the requested Master Admin. No existing platform privileges were revoked.

## Billing audit

Organizations contain plan_tier, subscription_status, billing_provider, billing_customer_id, subscription_id, current_period_end and capacity limits.

All four businesses currently have active subscription status and no period-end date. Active does not prove payment.

No subscriptions, invoices or subscription_payments tables are exposed. Existing payments contains sale_id, payment_method, amount and transaction_ref: these are POS checkout payments, not SaaS subscription revenue. Seven POS payment records are excluded from billing.

- Paid and Due: Unavailable, not zero.
- Overdue: businesses explicitly recorded as past_due, not invoice-calculated debt.
- Trial: businesses recorded as trialing.
- Expiring Soon: a known period end between the request timestamp and seven days later, inclusive.
- Payment Attention Required: shops whose business is recorded past due or expiring soon. Amount due and invoice due date remain unavailable.

Record Payment links to the missing-infrastructure explanation. No fake invoices, payments, amounts, dates or paid states were generated. Subscription edits do not record payment.

Before payment recording can be enabled, implement:
1. Subscription pricing, currency and billing cadence.
2. Organization-linked invoices with amounts, due dates and status.
3. A payment ledger linked to invoices with amount, method, actor and timestamps.
4. Allocation/refund rules, duplicate-payment prevention and validation.
5. Platform-only write policies, tenant read policies, audit records and backfill decisions.
6. Provider/webhook reconciliation if billing is automated.

## Security verification and unresolved legacy findings

Verified: server-side Supabase Auth and database profile checks; caller-supplied roles cannot grant access; admin mutation origin checks; owner rejection from platform APIs and foreign-shop switching; live stores RLS hiding the foreign tenant; no implicit tenant for Master Admin; explicit console context; suspended-shop rejection.

Auth identities, flags, memberships and Shop Owner credentials were not changed. RLS policies were not weakened or replaced.

**Full legacy retail tenant isolation is not signed off.** Pre-existing retail API queries use service-role access without tenant filters:
- Six products have no organization ID.
- Eighteen sales have neither organization nor store ID.
- The single settings record has no tenant column.
- Legacy product/sale/report/settings routes still use these global records.
- Checked-in settings RLS includes broad public policies. The profile policy also warrants review of privileged-column updates. Live policy definitions were not available through REST metadata, so migration text is not proof of the complete live policy configuration.

No legacy records were reassigned or deleted. Their ownership needs confirmation before a migration can preserve the Shop Owner data safely. A clarification was requested about whether all belong to Reyon Watch / Main Branch. Passing platform and stores-RLS tests are not proof of application-wide legacy isolation.

Legacy users is excluded from platform identity and KPI logic. No legacy authentication rows or password fields were created or modified.

## Validation

- npm test: 144 tests passed, including KPI definitions, billing rules, session separation and mutation authorization.
- Browser: Master Admin routing, six KPI drill-downs, Shop Owner retail navigation, API denials, live stores RLS, console selection/exit and billing gap.
- All 12 platform screens: no horizontal overflow at 320, 360, 375, 390, 414 and 1440 pixels.
- Mobile menu: all nine platform destinations, no retail primary navigation.
- TypeScript, lint and production build run before push. One pre-existing CheckoutModal hook-dependency warning remains; Next reports the existing middleware deprecation.
- Verification uses short-lived in-memory Auth sessions. It sends no email, resets no passwords and saves no credentials.

Reproduce browser checks against a running build:

    npx playwright install chromium
    node --env-file=.env.local scripts/verify-platform-ui.mjs http://localhost:3100

Screenshots go to the OS temporary directory. The script needs the existing local Supabase configuration. Do not run the older verify-authenticated-rls.ts script for this audit: it resets account passwords and provisions fixtures.

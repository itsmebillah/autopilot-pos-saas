# Autopilot POS SaaS — Comprehensive Project & Architecture Audit Report

**Date:** September 15, 2026  
**Auditor:** Antigravity AI  
**Repository:** [https://github.com/itsmebillah/autopilot-pos-saas.git](https://github.com/itsmebillah/autopilot-pos-saas.git)  
**Production Site:** [https://autopilot-pos-saas.vercel.app/](https://autopilot-pos-saas.vercel.app/)  
**Supabase Instance:** [https://dhgfevlwiwcblobpxjca.supabase.co](https://dhgfevlwiwcblobpxjca.supabase.co/)  
**Current Branch / Commit:** `main` @ `5fba71c` (docs: secure and document POS prototype setup)  
**Audit Scope:** Full repository code, security posture, database design, backend API handlers, frontend UI/UX, business logic, production deployment, package dependencies, and build pipelines.

---

## 1. Executive Summary & Project Health

Autopilot POS is an early-stage prototype for a web-based Point of Sale (POS) and inventory management system built with Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, and Supabase.

### Overall Project Health: ⚠️ **CRITICAL REMEDIATION REQUIRED BEFORE SAAS LAUNCH**

While the foundational UI flows (login page, dashboard stats, product catalog, sales register, invoice generation, reports, and settings) establish the product vision, the codebase currently suffers from **severe security vulnerabilities, non-transactional database operations, unauthenticated and unprotected routes, missing multi-tenancy isolation, lack of test coverage, and failing lint checks.**

### Key Numbers at a Glance
- **Total Audit Findings:** 38
  - **CRITICAL:** 7
  - **HIGH:** 10
  - **MEDIUM:** 11
  - **LOW:** 7
  - **INFO:** 3
- **TypeScript Errors:** 0 (`npx tsc --noEmit` clean)
- **ESLint Errors/Warnings:** 25 problems (20 errors, 5 warnings)
- **Test Suite Coverage:** 0% (No test framework installed, 0 tests)
- **NPM Package Vulnerabilities:** 10 (1 critical, 7 high, 1 moderate, 1 low)

---

## 2. Technology Stack & Environment Details

| Layer | Technology | Version | Notes / Observations |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.2.6` (Turbopack) | Canary/Latest v16 App Router |
| **Frontend Library** | React / React DOM | `19.2.4` | React 19 compiler/hooks ready |
| **Language** | TypeScript | `^5` | Strict mode enabled in `tsconfig.json` |
| **Styling** | Tailwind CSS / PostCSS | `^4.0.0` (`@tailwindcss/postcss`) | CSS-first configuration via `@import "tailwindcss"` |
| **Icons** | Lucide React | `^1.14.0` | Standard icon pack |
| **Notifications** | React Hot Toast | `^2.6.0` | Installed in `package.json` but never used in any UI screen (native `alert()` used instead) |
| **Database & Auth** | Supabase JS Client | `@supabase/supabase-js ^2.105.3` | Single browser-safe anonymous client |
| **Storage** | Supabase Storage | Bucket: `logos` | Public URL logo upload |
| **Package Manager** | npm | `11.13.0` (Node.js `v24.16.0`) | `package-lock.json` present |
| **Hosting / Infra** | Vercel | Production | Publicly deployed at `autopilot-pos-saas.vercel.app` |
| **Local CLI Tools** | Supabase CLI | `2.109.1` | Installed locally, but no `supabase/` migrations folder in repo |

---

## 3. Architecture & Repository Structure Audit

### 3.1 Folder Structure
```text
autopilot-pos-saas/
├── .env.example              # Example environment variables
├── .gitignore                # Git ignore rules
├── AGENTS.md                 # Agent instructions
├── CLAUDE.md                 # Assistant instructions
├── README.md                 # Project documentation
├── SECURITY.md               # Prototype disclaimer
├── eslint.config.mjs         # ESLint 9 flat configuration
├── next.config.ts            # Next.js config
├── package.json              # Dependencies and scripts
├── package-lock.json         # Dependency tree lockfile
├── postcss.config.mjs        # PostCSS 4 configuration
├── tsconfig.json             # TypeScript config
├── app/
│   ├── favicon.ico
│   ├── globals.css           # Global Tailwind CSS
│   ├── layout.tsx            # Root layout with Geist fonts
│   ├── page.tsx              # Unprotected Client-side Login page
│   ├── api/
│   │   ├── dashboard/route.ts       # GET stats (unbounded DB scan)
│   │   ├── login/route.ts           # POST plaintext password check
│   │   ├── products/
│   │   │   ├── route.ts             # POST create/merge product
│   │   │   ├── delete/route.ts      # POST product delete (non-REST)
│   │   │   ├── list/route.ts        # GET product list
│   │   │   └── update/route.ts      # POST product update (non-REST)
│   │   ├── reports/route.ts         # GET reports (in-memory aggregation)
│   │   ├── sales/
│   │   │   ├── create/route.ts      # POST create sale (client-trusted math & race conditions)
│   │   │   └── list/route.ts        # GET all sales
│   │   ├── settings/route.ts        # GET / POST global settings
│   │   └── upload-logo/route.ts     # POST file upload to Supabase storage
│   └── dashboard/
│       ├── page.tsx                 # Main KPI Dashboard
│       ├── invoice/page.tsx         # Invoice printable view
│       ├── orders/page.tsx          # Order history
│       ├── products/page.tsx        # Product catalog & stock
│       ├── reports/page.tsx         # Financial & sales summary
│       ├── sales/page.tsx           # POS Register / Cart
│       └── settings/page.tsx        # Store profile & logo
├── components/
│   └── Sidebar.tsx           # Hardcoded navigation sidebar
└── lib/
    └── supabase.ts           # Global Supabase client init
```

### 3.2 Architectural Deficiencies
1. **No Middleware / Session Layer:** Next.js `middleware.ts` is absent. There is zero route protection, no cookie validation, and no token inspection.
2. **Missing Database Migrations:** No `supabase/migrations/` or schema definition files exist. Database setup cannot be deterministically reproduced in local or staging environments.
3. **No Domain Layer / Service Layer:** Business logic, database queries, and response formatting are crammed directly into route handler files without separation of concerns.
4. **Duplicate API Pattern vs Server Actions:** Next.js App Router route handlers are used as internal endpoints called by client `fetch()`, rather than leveraging Server Actions or typed RPC procedures.
5. **No Data Validation Library:** No Zod, Yup, or Valibot schema validation is implemented. Raw request bodies are cast directly.

---

## 4. Supabase & Database Audit

### 4.1 Inferred Database Schema & Tables
From inspecting API routes and queries, the system interacts with 5 tables and 1 storage bucket:

1. **`users`**:
   - Fields: `id`, `email`, `password` (plaintext!), `created_at`
2. **`products`**:
   - Fields: `id`, `name`, `barcode`, `category`, `buy_price`, `sell_price`, `stock`, `created_at`
3. **`sales`**:
   - Fields: `id`, `invoice_no`, `total`, `created_at`
4. **`sale_items`**:
   - Fields: `id`, `sale_id`, `product_id`, `quantity`, `price`, `cost`, `profit`, `created_at`
5. **`settings`**:
   - Fields: `id`, `store_name`, `phone`, `address`, `currency`, `logo_url`, `created_at`
6. **Storage Bucket `logos`**:
   - Stores store logo images with public read permissions.

### 4.2 Critical Database Deficiencies
- **Missing Multi-Tenant Isolation (`store_id` / `org_id`):** Every table is globally shared. A sale created by one store is visible to all stores. Settings are global (one store overwrites another).
- **Missing Row Level Security (RLS) Configuration:** Since the client uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`, if RLS is not strictly enabled and configured with policies, anyone with the public anon key can read and write all database rows directly via Supabase PostgREST API.
- **Missing Foreign Keys & Cascade Constraints:** `sale_items.sale_id` and `sale_items.product_id` lack documented foreign key constraints, risk dangling records if products or sales are deleted.
- **Missing Indexes:** No indexes on `products.barcode`, `products.name`, `sales.invoice_no`, `sales.created_at`, or `sale_items.sale_id`.
- **Missing Database Transaction (Atomicity):** Sale creation requires inserting `sales`, inserting `sale_items`, and updating `products.stock`. In the current code, these run as separate asynchronous queries; if any step fails, the database enters an inconsistent, corrupted state.

---

## 5. Security & Threat Audit

### 🚨 Critical Vulnerability 1: Plaintext Password Authentication & Exposure
- **Location:** `app/api/login/route.ts` (Lines 10–16), `app/page.tsx`
- **Problem:** Passwords are stored in plaintext in the `users` table and compared via `.eq("password", password)`. Furthermore, `select("*")` returns the plaintext password in the response payload.
- **Impact:** Instant credential theft upon any DB leak or network inspection.
- **Remediation:** Migrate to Supabase Auth (`supabase.auth.signInWithPassword`), hash passwords, and use secure HTTP-only cookies.

### 🚨 Critical Vulnerability 2: Zero Authentication & Zero Authorization on All API Routes
- **Location:** Every route under `app/api/*` (`/api/products`, `/api/products/delete`, `/api/products/update`, `/api/sales/create`, `/api/settings`, `/api/reports`, `/api/dashboard`)
- **Problem:** Not a single API endpoint inspects a session token, user ID, or role.
- **Impact:** Any unauthenticated actor on the internet can send a POST request to `/api/products/delete` with `{"id": "..."}` or POST to `/api/products` and wipe or alter products.

### 🚨 Critical Vulnerability 3: Zero UI Route Protection / IDOR
- **Location:** `app/dashboard/*`
- **Problem:** Login form in `app/page.tsx` simply executes `router.push("/dashboard")` on success without setting any session or token. The dashboard pages perform client-side `fetch()` with no auth headers.
- **Impact:** Anyone visiting `https://autopilot-pos-saas.vercel.app/dashboard` has unrestricted access to the UI.

### 🚨 Critical Vulnerability 4: Untrusted Client Pricing & Arbitrary Calculations
- **Location:** `app/api/sales/create/route.ts` (Lines 10–45)
- **Problem:** The server accepts `total`, `item.sell_price`, `item.buy_price`, and `item.profit` directly from the client JSON payload and writes them into `sales` and `sale_items`.
- **Impact:** A malicious user or rogue cashier can submit a sale with `total: 0.01` or modify the buy/sell price and fake revenue/profit numbers.

### 🚨 Critical Vulnerability 5: Unbounded Storage Upload
- **Location:** `app/api/upload-logo/route.ts` (Lines 8–39)
- **Problem:** Accepts any file without validating MIME type, extension, or size limit (e.g. 2MB max).
- **Impact:** Storage exhaustion attacks, uploading malicious executable files or HTML payloads into the bucket.

---

## 6. Business Logic & POS Domain Audit

| Feature Flow | Current Implementation | Issues Identified | Severity |
|---|---|---|---|
| **Stock Management** | Deducts `item.stock - item.quantity` sent by client | Race condition: Client passes cached `stock`; simultaneous checkouts overwrite DB stock. No check for negative stock. | **CRITICAL** |
| **Product Creation** | Checks if name exists; if so, adds stock | Silently merges products with same name even if barcode/price differ. Update ignores barcode uniqueness. | **HIGH** |
| **Cart Operations** | In-memory React state | `+` button in cart does not check stock limit; can increment past available inventory. | **HIGH** |
| **Checkout & Invoice** | Serializes entire cart array into URL query string | URL size limits; exposing transaction details in browser history; invoice page cannot reload historical receipts cleanly. | **HIGH** |
| **Orders / History** | Displays list of `invoice_no` and `total` | No detail drawer/modal, cannot view items purchased, no cashier/customer name, no reprint button. | **MEDIUM** |
| **Financial Reports** | Pulls all records into memory; filters by `saleDate.getMonth() === new Date().getMonth()` | Does not check year (March 2025 matches March 2026). Total profit is calculated across all time instead of monthly. Timezone skew from UTC conversion. | **HIGH** |
| **Settings Management** | Single row in `settings` table | Submitting settings without uploading a new logo file overwrites `logo_url` with empty string `""`. | **HIGH** |
| **Multi-Currency** | Hardcoded `৳` across components | Settings page has currency field, but dashboard, sales, products, and reports hardcode `৳`. | **MEDIUM** |
| **Customer Tracking** | Sidebar links to `/dashboard/customers` | Route does not exist (404 Not Found). No customer selection or walk-in option during checkout. | **HIGH** |
| **Tax & Discounts** | None | No tax (VAT/GST), line-item discounts, or order-level discounts supported. | **MEDIUM** |
| **Payment Methods** | Hardcoded "Cash" | No support for Card, bKash, Nagad, Bank Transfer, or Split Payments. | **MEDIUM** |

---

## 7. Frontend & UI/UX Audit

### 7.1 Layout & Navigation
- **Broken Sidebar Link:** The "Customers" link in `components/Sidebar.tsx` targets `/dashboard/customers`, which returns a **404 Not Found** in production.
- **No Active Route Highlighting:** `Sidebar.tsx` does not use `usePathname()` to highlight the current active page.
- **Client Navigation Anti-Pattern:** Sidebar uses standard HTML `<a>` tags instead of Next.js `<Link>` components, causing full-page reloads and losing state.
- **Non-Responsive Sidebar:** Sidebar is a fixed `w-64 min-h-screen` container with no hamburger toggle or mobile drawer. Breaks on mobile viewports (< 768px).
- **Non-Functional Logout Button:** Logout button in `app/dashboard/page.tsx` has no `onClick` handler.

### 7.2 State Management & React Anti-Patterns
- **ESLint Rule Violations (`react-hooks/set-state-in-effect`):** Direct asynchronous data fetching triggering `setState` within `useEffect` without proper cleanup/abort controllers in `dashboard/page.tsx`, `products/page.tsx`, `reports/page.tsx`, `sales/page.tsx`, and `settings/page.tsx`.
- **Unused State & Dead Code:** `editingId` in `app/dashboard/products/page.tsx` is declared but never read or used.
- **Incomplete Product Card Editing:** Product cards allow inline editing of `name`, but `price`, `barcode`, `category`, and `stock` are static text. Clicking "Save" submits partially edited records.
- **Alerts Instead of Toasts:** Code uses blocking browser `alert()` calls despite having `react-hot-toast` installed.
- **No Loading or Skeleton States:** All pages show `0` or empty lists until `fetch()` resolves, causing layout shift (CLS).
- **Hydration Vulnerability in Invoice Page:** `if (typeof window === "undefined") return null;` placed after hook invocations in `app/dashboard/invoice/page.tsx` violates React Hook ordering rules.
- **Print Styles Missing:** Invoice page relies on `window.print()` without print CSS media queries; prints the dark background, sidebar, and action buttons.

---

## 8. Backend & Performance Audit

### 8.1 Critical Performance Bottlenecks
1. **Unbounded In-Memory Table Scans in Dashboard & Reports:**
   - `app/api/dashboard/route.ts`: Runs `select("*")` on `products`, `customers`, and `sales`.
   - `app/api/reports/route.ts`: Runs `select("*")` on `sales`, `products`, and `sale_items`.
   - *Impact:* When the store reaches 10,000 sales and 50,000 items, every page load transfers megabytes of JSON and crashes serverless function memory/execution limits.
   - *Fix:* Replace with SQL aggregation queries (`COUNT`, `SUM`) and indexed date ranges (`gte('created_at', startOfMonth)`).
2. **Missing Pagination:**
   - `/api/products/list` and `/api/sales/list` return all records at once.
   - *Fix:* Implement cursor or offset-based pagination (`limit`, `offset`, `page`).
3. **Repeated Sequential Queries in Sale Creation:**
   - `app/api/sales/create/route.ts` loops through `cart` and performs individual `await supabase.from("products").update(...)` HTTP calls sequentially.
   - *Impact:* For a cart with 10 items, this triggers 12 consecutive network round-trips to Supabase.
   - *Fix:* Batch updates or execute within a single PostgreSQL stored procedure / RPC.

---

## 9. Production / Vercel Deployment Audit

- **Production URL:** `https://autopilot-pos-saas.vercel.app/`
- **Live Status:** Accessible online.
- **Discrepancies Observed:**
  1. **Metadata Out of Sync:** Production page HTML title is `<title>Create Next App</title>` and description is `"Generated by create next app"`, whereas repository `app/layout.tsx` defines `"Autopilot POS"`.
  2. **Route 404:** `/dashboard/customers` produces a Vercel 404 error page when clicked from navigation.
  3. **Zero Auth Protection:** Production `/dashboard`, `/dashboard/sales`, `/dashboard/products`, etc., are completely open to the public internet without login.
  4. **Direct API Exposure:** All `/api/*` endpoints are exposed and callable by anyone via curl/Postman on production Vercel deployment.

---

## 10. Git History & Repository Hygiene

- **Commit History:** 7 commits on `main`.
  - `5fba71c`: docs: secure and document POS prototype setup *(MD documentation updates)*
  - `6705292`: Added reports system
  - `ccd6917`: Fix invoice build issue
  - `992899a`: Fix invoice prerender issue
  - `80589be`: POS inventory, sales, invoice, settings update
  - `6b70b68`: products system added
  - `9ccfe8a`: Initial commit from Create Next App
- **Branches:** `main` (active), `master` (stale at initial commit).
- **Environment Handling:** `.env.example` exists. `.gitignore` properly ignores `.env*` (except `.env.example`).
- **Development Artifacts:** `console.log("SAVE CLICKED")` and duplicate logs committed in `app/dashboard/settings/page.tsx`.

---

## 11. Build, Lint & Test Execution Results

| Check | Command Run | Exit Code | Result Summary | Root Cause |
|---|---|---|---|---|
| **TypeScript Check** | `npx tsc --noEmit` | `0` | **PASSED** | No TypeScript syntax or type errors detected. |
| **ESLint** | `npm run lint` | `1` | **FAILED** (20 errors, 5 warnings) | ESLint 9 + React Hook rules flagging `setState` inside `useEffect`, and explicit `any` types. |
| **Production Build** | `npm run build` | `1` *(without env)* / `0` *(with env)* | **PASSED (CONDITIONAL)** | `lib/supabase.ts` throws at build time if `NEXT_PUBLIC_SUPABASE_URL` is missing. With mock/valid env vars, build compiles successfully into static/dynamic routes. |
| **Test Suite** | N/A | N/A | **NO TESTS** | No test framework (Jest/Vitest/Playwright) is configured in `package.json`. |
| **NPM Audit** | `npm audit` | `1` | **10 Vulnerabilities** (1 critical, 7 high, 1 moderate, 1 low) | Outdated versions of `next` (16.2.6), `postcss`, `sharp`, and dev dependencies with known CVEs. |

---

## 12. Comprehensive Priority Matrix of Findings

### Severity Levels:
- **CRITICAL**: Immediate security risk, data loss, corruption, or blocker.
- **HIGH**: Major business logic flaw, broken user flow, or severe performance issue.
- **MEDIUM**: Suboptimal UX, missing standard features, or code quality concern.
- **LOW**: Minor inconsistency, styling defect, or cleanup.
- **INFO**: Architectural note or best practice recommendation.

---

### Priority Table

| ID | Priority | Area | File / Location | Summary of Problem | Recommended Fix |
|---|---|---|---|---|---|
| **SEC-01** | **CRITICAL** | Security / Auth | `app/api/login/route.ts:10-16` | Passwords stored & compared in plaintext; returns password in JSON. | Switch to Supabase Auth (`signInWithPassword`) with secure sessions. |
| **SEC-02** | **CRITICAL** | Security / Auth | `app/api/*` (All routes) | All API routes are completely unauthenticated. | Implement session validation middleware and user authentication checks. |
| **SEC-03** | **CRITICAL** | Security / Auth | `app/dashboard/*`, `app/page.tsx` | Zero client route guarding; dashboard is publicly accessible without login. | Add Next.js `middleware.ts` to enforce authenticated session cookies. |
| **SEC-04** | **CRITICAL** | Business Logic / Data | `app/api/sales/create/route.ts:50-62` | Non-transactional sale creation; stock overwrite race condition. | Use PostgreSQL RPC / Stored Procedure with atomic transaction (`BEGIN...COMMIT`) and stock decrement. |
| **SEC-05** | **CRITICAL** | Security / Integrity | `app/api/sales/create/route.ts:10-45` | Untrusted client pricing, costs, profits, and stock levels. | Re-fetch prices and calculate totals/profits strictly server-side. |
| **DB-01** | **CRITICAL** | Database / Multi-Tenancy | All tables (`products`, `sales`, `settings`) | Zero multi-tenancy isolation (`store_id` / `org_id` missing). | Add `store_id` (or `tenant_id`) foreign key to all tables and enforce via RLS. |
| **DB-02** | **CRITICAL** | Database / Security | Supabase DB Schema | No checked-in SQL migrations or RLS policy definitions. | Initialize `supabase/migrations` and write declarative SQL schemas & RLS policies. |
| **BUG-01** | **HIGH** | POS / Inventory | `app/api/products/route.ts:27-47` | Duplicate product name silently merges stock without validation. | Enforce barcode/SKU uniqueness; provide explicit stock-adjustment UI. |
| **BUG-02** | **HIGH** | POS / Cart | `app/dashboard/sales/page.tsx:184-201` | Cart quantity increment ignores available product stock. | Enforce `quantity < product.stock` cap on cart `+` button. |
| **BUG-03** | **HIGH** | POS / Settings | `app/dashboard/settings/page.tsx:59-90` | Saving settings without new file uploads wipes `logo_url` to empty string. | Preserve existing `logo_url` if no new file is uploaded. |
| **BUG-04** | **HIGH** | POS / Reports | `app/api/reports/route.ts:56-65` | Monthly report checks month index without year check (combines across years). | Filter query by date range (`created_at >= start_of_month AND created_at <= end_of_month`). |
| **BUG-05** | **HIGH** | Frontend / UX | `components/Sidebar.tsx:47-53` | "Customers" link points to `/dashboard/customers` which is a 404 route. | Implement Customers management module or remove link until ready. |
| **BUG-06** | **HIGH** | POS / Checkout | `app/dashboard/sales/page.tsx:234-266` | Checkout submits empty cart without validation. | Disable checkout button when cart is empty; validate `cart.length > 0` on server. |
| **PERF-01** | **HIGH** | Performance | `app/api/dashboard/route.ts:6-17` | `select("*")` unbounded table scans for dashboard KPI counts. | Use `supabase.from(...).select('*', { count: 'exact', head: true })` and DB aggregates. |
| **PERF-02** | **HIGH** | Performance | `app/api/reports/route.ts:9-25` | In-memory loading of all sales and items for report analytics. | Write SQL aggregate view or RPC functions for daily/monthly metrics. |
| **PERF-03** | **HIGH** | Performance | `app/api/sales/create/route.ts:50-62` | N+1 sequential update queries for cart items during sale checkout. | Batch stock updates or handle in a single database function. |
| **SEC-06** | **HIGH** | Security / Storage | `app/api/upload-logo/route.ts:8-39` | File upload accepts any file type and unlimited size. | Validate MIME type (PNG/JPEG/WebP) and enforce 2MB max file size. |
| **FE-01** | **MEDIUM** | Frontend / Code Quality | `app/dashboard/**/page.tsx` | 20 ESLint errors for `setState` in `useEffect` and `any` types. | Refactor data fetching with Server Components or React Query / SWR with typed interfaces. |
| **FE-02** | **MEDIUM** | Frontend / Navigation | `components/Sidebar.tsx` | Standard `<a>` tags cause full-page refreshes; no active link highlight. | Use Next.js `<Link>` and `usePathname()` for active styling. |
| **FE-03** | **MEDIUM** | Frontend / Responsive | `components/Sidebar.tsx`, `app/dashboard/` | Fixed sidebar breaks on mobile and tablet screens. | Add mobile responsive hamburger navigation drawer. |
| **FE-04** | **MEDIUM** | Frontend / UX | `app/dashboard/page.tsx:56-58` | Logout button has no `onClick` handler. | Implement logout handler clearing session and redirecting to `/`. |
| **FE-05** | **MEDIUM** | Frontend / UX | `app/dashboard/invoice/page.tsx:138-157` | Seller name ("Masum") and Payment ("Cash") are hardcoded in invoice. | Dynamically bind cashier name from session and payment method from sale record. |
| **FE-06** | **MEDIUM** | Frontend / Print | `app/dashboard/invoice/page.tsx:224-248` | `window.print()` prints sidebar, black background, and navigation buttons. | Add `@media print` CSS utility classes (`print:hidden`, `print:bg-white`, `print:p-0`). |
| **FE-07** | **MEDIUM** | Frontend / Feedback | `app/dashboard/products/page.tsx:67-85` | Uses native blocking `alert()` despite `react-hot-toast` installed. | Integrate `react-hot-toast` for modern toast notifications. |
| **FE-08** | **MEDIUM** | Frontend / Localization | Multiple files | Currency symbol `৳` hardcoded instead of store setting value. | Use centralized currency formatter hook using `settings.currency`. |
| **FE-09** | **MEDIUM** | Frontend / UX | `app/dashboard/products/page.tsx:293-442` | Product cards only allow editing name; other fields are static text. | Add comprehensive Edit Modal or expandable table with full field editing. |
| **FE-10** | **MEDIUM** | Frontend / Safety | `app/dashboard/products/page.tsx:363-399` | Delete button immediately deletes product with no confirmation. | Add confirmation modal/dialog before permanent deletion. |
| **ARCH-01**| **MEDIUM** | Architecture / API | `app/api/products/delete/`, `update/` | Non-RESTful HTTP POST routes for delete and update actions. | Use RESTful HTTP verbs (`DELETE`, `PATCH`) or Next.js Server Actions. |
| **FE-11** | **LOW** | Frontend / UX | `app/dashboard/orders/page.tsx:38-56` | Sales history displays only invoice number and total. | Add order details drawer/modal with full line-item inspection and re-print. |
| **FE-12** | **LOW** | Frontend / UX | `app/dashboard/page.tsx`, `products/page.tsx` | No skeleton loaders or loading spinners. | Add Skeleton loading placeholders. |
| **FE-13** | **LOW** | Frontend / Search | `app/dashboard/products/page.tsx:98-105` | Search performs client-side linear array filtering. | Implement server-side search with debounce. |
| **FE-14** | **LOW** | Frontend / Architecture | `app/dashboard/invoice/page.tsx:257-259` | Entire cart JSON passed via URL query parameter. | Pass only `invoice_id` and fetch invoice details by ID from database. |
| **DEV-01** | **LOW** | Code Cleanliness | `app/dashboard/settings/page.tsx:57, 84-85` | Leftover debug `console.log` statements in production code. | Remove console logs. |
| **DEV-02** | **LOW** | Git Hygiene | Remote Repository | Stale `master` branch exists alongside `main`. | Delete stale `master` branch from GitHub. |
| **DEV-03** | **LOW** | Meta / SEO | `app/layout.tsx` vs Production | Production meta tags show "Create Next App". | Re-deploy to sync production metadata with layout. |
| **QA-01**  | **INFO** | Testing | Project Root | Zero automated tests (unit, integration, or E2E). | Setup Vitest / Playwright test suite for sales, inventory, and auth. |
| **DEP-01** | **INFO** | Dependencies | `package.json` | 10 package vulnerabilities reported by `npm audit`. | Update dependencies (`npm audit fix`) and Next.js patches. |
| **OPS-01** | **INFO** | CI/CD & Deploy | `.github/workflows/` | No GitHub Actions CI pipeline for linting, typechecking, and testing. | Configure GitHub Actions CI workflow on pull requests. |

---

## 13. Strategic Roadmap & Recommended Next Steps

To transition this codebase from an early prototype into a secure, robust, and scalable SaaS Point of Sale system, the development work should proceed in the following structured phases:

### Phase 1: Security & Database Architecture Overhaul (Critical Foundation)
1. Initialize Supabase migrations directory (`supabase/migrations/`).
2. Define complete relational PostgreSQL schema:
   - `tenants` / `stores`
   - `users` (linked to `auth.users`) with roles (`admin`, `manager`, `cashier`)
   - `categories` & `products` (with SKU, barcode uniqueness, tax rate, low stock threshold)
   - `customers` & `suppliers`
   - `sales` & `sale_items` (with payment methods, discount, tax, cashier_id, customer_id)
   - `stock_movements` (audit log for every stock increase/decrease)
3. Implement strict PostgreSQL Row Level Security (RLS) policies enforcing tenant isolation.
4. Implement PostgreSQL RPC function `create_sale_transaction(...)` for atomic checkout and stock decrement.

### Phase 2: Authentication, Authorization & Session Guards
1. Integrate Supabase Auth (`@supabase/ssr`).
2. Add Next.js `middleware.ts` to protect all `/dashboard/*` and `/api/*` routes.
3. Build proper Login, Forgot Password, and Profile Management screens.
4. Add Role-Based Access Control (RBAC): restrict Settings and Reports to store owners/managers.

### Phase 3: POS Register & Inventory Feature Polish
1. Re-engineer Sales Register:
   - Fast keyboard shortcuts & barcode scanner listener.
   - Payment method selector (Cash with change calculator, Card, Mobile Banking).
   - Customer search and quick customer creation.
   - Line-item and order-level discount/tax calculations.
2. Refactor Product Management:
   - Complete modal-based create/edit with image upload, barcode generator, and category picker.
   - Stock adjustment workflow with reason codes (Purchase, Damage, Return).
   - Server-side pagination, search, and category filtering.
3. Build Missing Customers Module (`/dashboard/customers`).

### Phase 4: Order History, Invoicing & Analytics
1. Rewrite Invoice Page: fetch by `sale_id`, design professional printable thermal receipt (80mm/58mm) and standard A4 receipt with `@media print` styling.
2. Rebuild Orders Page: searchable list with filters (date, cashier, payment method) and detailed order preview modal.
3. Overhaul Reports & Analytics: daily sales summary, monthly revenue vs profit charts, top-selling products, and inventory valuation.

### Phase 5: Code Quality, Testing & CI/CD
1. Fix all 25 ESLint errors and configure strict type checking.
2. Replace `alert()` with `react-hot-toast`.
3. Add Vitest unit tests for pricing/cart calculations and Playwright E2E tests for checkout flow.
4. Setup GitHub Actions CI pipeline.

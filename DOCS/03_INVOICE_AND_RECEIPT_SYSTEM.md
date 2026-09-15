# Autopilot POS SaaS — Production Invoice & Receipt System

**Document ID:** `DOCS/03_INVOICE_AND_RECEIPT_SYSTEM.md`  
**Date:** September 15, 2026  
**Status:** ✅ Production Implemented & Verified

---

## 1. System Architecture & Flow

The Autopilot POS Invoice & Receipt System provides an end-to-end server-authoritative checkout and invoice printing pipeline:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────────┐
│  POS Sales Cart │ ───▶  │  Checkout Modal │ ───▶  │  /api/sales/create  │
│  (Scan / Click) │       │ (Split Tenders) │       │  (Atomic DB Record) │
└─────────────────┘       └─────────────────┘       └─────────────────────┘
                                                               │
                                                               ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────────┐
│  Print Receipt  │ ◀───  │  Invoice Modal  │ ◀───  │ Canonical Snapshot │
│ (58mm/80mm/A4)  │       │ (Live Preview)  │       │    (InvoiceData)    │
└─────────────────┘       └─────────────────┘       └─────────────────────┘
```

---

## 2. Canonical Invoice Data Model (`lib/invoice-engine.ts`)

Every transaction generates an immutable `InvoiceData` snapshot:

```typescript
export interface InvoiceData {
  business: {
    name: string;
    store_name: string;
    logo_url?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    tax_number?: string | null; // VAT / GST / BIN
    tax_label?: string; // 'VAT', 'GST', 'Tax'
  };
  transaction: {
    invoice_no: string;
    sale_id?: string;
    created_at: string;
    date_formatted: string;
    time_formatted: string;
    cashier_name?: string;
    payment_status: "PAID" | "PARTIAL" | "DUE" | "REFUNDED";
    sale_status: "COMPLETED" | "VOIDED" | "RETURNED";
    notes?: string | null;
  };
  customer?: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    loyalty_points?: number;
  } | null;
  items: Array<{
    name: string;
    sku?: string | null;
    barcode?: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
    serial_numbers?: string[];
    batch_number?: string | null;
    expiry_date?: string | null;
  }>;
  totals: {
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    paid_amount: number;
    change_amount: number;
    due_amount: number;
  };
  payments: Array<{
    method: string; // 'CASH', 'CARD', 'MOBILE', 'BANK', 'CREDIT'
    amount: number;
    transaction_ref?: string | null;
  }>;
  config: {
    currency_code: string;
    currency_symbol: string;
    currency_position: "BEFORE" | "AFTER";
    tax_label: string;
    footer_message: string;
    return_policy: string;
    receipt_template: "thermal_58mm" | "thermal_80mm" | "a4_standard";
  };
}
```

---

## 3. Supported Print Layouts & Templates

### 🖨️ 1. Thermal 80mm Standard (`thermal_80mm`)
- **Target**: Standard 80mm ESC/POS thermal receipt printers.
- **Layout**: High readability (320px width), store logo header, tax registration, date/time breakdown, itemized descriptions with SKU, subtotal, discount, VAT, multi-payment tender breakdown, change/due, Code-128 barcode, and return policy notice.

### 🖨️ 2. Thermal 58mm Compact (`thermal_58mm`)
- **Target**: Portable Bluetooth / mini 58mm mobile receipt printers.
- **Layout**: Compact monospace format (220px width), high-density typography, abbreviated headers, quantity multipliers, total payable, barcode, and footer message.

### 📄 3. A4 Professional Invoice (`a4_standard`)
- **Target**: Standard desktop office printers & PDF exports.
- **Layout**: Corporate invoice format with company branding, tax invoice badge, bill-to customer details, itemized table with serial numbers and batch expiry, subtotal/tax summary box, payment breakdown, terms & conditions, and customer / authorized signature blocks.

---

## 4. Historical Snapshot Integrity

- Invoices never recalculate values from mutating live catalog prices.
- When `sale_items` are created, the exact `product_name`, `unit_price`, `unit_cost`, `subtotal`, and `profit` at the instant of transaction are saved permanently.
- If a product is renamed, recategorized, or deleted in the future, reprinting the historical invoice from `/dashboard/orders` reproduces the exact original sale.

---

## 5. Store Settings & Internationalization

Configurable via `/dashboard/settings` and `/api/settings`:
- **Branding**: Store Name, Phone, Email, Website, Outlet Address, Logo image.
- **Taxation**: Tax / VAT Registration Number (BIN / GST), Tax Label (`VAT`, `GST`, `Sales Tax`), Default Tax Rate.
- **Currencies**: Currency Symbol (`৳`, `$`, `€`, `£`, `AED`, `₹`), ISO Code (`BDT`, `USD`, `EUR`), Symbol Position (`BEFORE` / `AFTER`).
- **Footer & Policy**: Customizable receipt thank-you message and return/warranty terms.
- **Default Format**: Preference for 80mm, 58mm, or A4 printing.

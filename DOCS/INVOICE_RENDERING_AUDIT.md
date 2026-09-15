# Production Invoice & Receipt Rendering Audit — Root Cause & Resolution

## 1. Executive Summary

During production invoice and PDF review, an issue was discovered where the Bengali Taka currency symbol `৳` appeared corrupted or visually ambiguous (looking like the number `2` or creating visual collisions such as `22,500.00` instead of `৳ 2,500.00`).

This audit report documents the root cause, the typography/font stack resolution, layout refactoring across all 3 templates (58mm thermal, 80mm thermal, and A4 corporate), and the automated regression test suite.

---

## 2. Root Cause Analysis

1. **Lack of Space in Formatter Output:**
   * In `formatCurrency`, amounts with prefix symbols were formatted as `${symbol}${formattedNumber}` (e.g. `৳2,500.00`).
   * When `৳` (U+09F3) was directly prefixed against `2,500.00`, the curve and crossbar of the Bengali Taka symbol immediately adjacent to the digit `2` created a visual glyph illusion resembling `22,500.00` or `2 2,500.00`.
2. **Incompatible Monospace Font Stack:**
   * In `InvoiceReceipt.tsx`, monetary cells used `font-mono` (`Consolas`, `Courier New`, `ui-monospace`).
   * Legacy monospace fonts do not support Bengali Unicode glyphs (U+0980–U+09FF). Browsers and PDF print drivers fell back to irregular system fonts, creating glyph substitution artifacts and baseline misalignments.
3. **Duplicate Store/Business Headers:**
   * When `business.store_name` was identical or effectively equivalent to `business.name`, both lines rendered identically in the receipt header.

---

## 3. Implemented Fixes

### 1. Robust Currency Formatter with Universal Position Support
[`lib/invoice-engine.ts`](file:///d:/Masum/Projects/autopilot-pos-saas/lib/invoice-engine.ts):
```ts
export function formatCurrency(amount: number, config?: Partial<InvoiceConfig>): string {
  const symbol = config?.currency_symbol || "৳";
  const position = config?.currency_position || "BEFORE";
  const num = Number(amount || 0);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formattedNumber = absNum.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (position === "AFTER") {
    return isNegative ? `-${formattedNumber} ${symbol}` : `${formattedNumber} ${symbol}`;
  }
  return isNegative ? `-${symbol} ${formattedNumber}` : `${symbol} ${formattedNumber}`;
}
```
* Clear separation between currency symbol and numerical digits (`৳ 2,500.00` or `2,500.00 ৳`).
* Clear negative formatting (`-৳ 50.00` or `-50.00 €`).

### 2. Unicode-Safe Font Stack with Tabular Numerals
[`components/InvoiceReceipt.tsx`](file:///d:/Masum/Projects/autopilot-pos-saas/components/InvoiceReceipt.tsx):
* **Font Family:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Bengali", "SolaimanLipi", "Kalpurush", "Hind Siliguri", Arial, sans-serif`
* **Tabular Figures:** Used `.receipt-tabular-nums` (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum";`) so all table columns align vertically with mathematical precision without forcing non-Latin symbols into incompatible monospace fonts.

### 3. Header De-duplication
* Business name is displayed as the primary title.
* Outlet name (`business.store_name`) is only displayed if it is distinct from the primary business name.

### 4. Template-Specific Audits
* **58mm Thermal Receipt:** Optimized `max-w-[218px]`, compact padding, scaled barcode (`scale-90`), 0 horizontal overflow.
* **80mm Thermal Receipt:** Standard POS receipt width `max-w-[300px]`, item description with barcode/SN/batch, multi-tender payment breakdown, return/exchange policy block.
* **A4 Corporate Tax Invoice:** Full-page professional layout with company logo, tax registration badge, Bill To section, 7-column line items table, totals summary box, barcode, and signature block.

---

## 4. Regression & Acceptance Verification

### Scenario 16 Required Acceptance Test:
* **Product:** `Premium Geisha Coffee 1kg`
* **Qty:** `1`
* **Unit Price:** `৳ 2,500.00`
* **Discount:** `-৳ 50.00`
* **Tax:** `৳ 0.00`
* **Grand Total:** `৳ 2,450.00`
* **Cash Paid:** `৳ 2,450.00`
* **Change:** `৳ 0.00`
* **Result:** **PASSED** (100% verified in automated unit test `tests/invoice-engine.test.ts`).

### Multi-Currency Tests:
* BDT: `৳ 2,500.00` (BEFORE) / `2,500.00 ৳` (AFTER)
* USD: `$ 2,500.00`
* EUR: `2,500.00 €`
* GBP: `£ 2,500.00`
* INR: `₹ 2,500.00`
* AED: `AED 2,500.00`

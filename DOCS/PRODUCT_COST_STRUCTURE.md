# Autopilot POS SaaS — Product Cost Structure & Landed Cost Architecture

## 1. Executive Summary

This document specifies the authoritative Product Costing model implemented in **Autopilot POS SaaS**. The system clearly distinguishes between **Purchase Cost** (the supplier price paid for goods) and **Additional Costs** (packaging, transport, handling, customization, freight) to compute the **Total / Landed Cost**.

---

## 2. Mathematical Foundation & Core Formulas

### 1. Landed Cost (Total Unit Cost)
$$\text{Landed Cost} = \text{Purchase Cost} + \text{Additional Cost}$$

* **Purchase Cost:** Direct supplier acquisition price per unit.
* **Additional Cost:** Sum of attributable acquisition overheads (box, packaging, freight, handling, customization).
* **Authoritative Store Column:** Stored in `buy_price` as canonical Landed Cost for 100% backward compatibility.

### 2. Gross Profit & Gross Margin
$$\text{Gross Profit} = \text{Selling Price} - \text{Landed Cost}$$
$$\text{Gross Margin \%} = \left( \frac{\text{Gross Profit}}{\text{Selling Price}} \right) \times 100$$

### 3. Bulk Batch Allocation
When goods are acquired in batches with collective overheads (e.g. ৳800 total shipping for 100 units):
$$\text{Allocated Additional Cost Per Unit} = \frac{\text{Total Batch Additional Cost}}{\text{Batch Quantity}}$$
$$\text{Unit Landed Cost} = \text{Unit Purchase Cost} + \text{Allocated Additional Cost Per Unit}$$

---

## 3. Universal & Configurable Cost Breakdown

The data model uses a JSONB `cost_breakdown` field so businesses worldwide can track specific overheads without hardcoded limits:

```json
{
  "packaging": 20.00,
  "transport": 10.00,
  "handling": 5.00,
  "customization": 0.00,
  "other": 0.00
}
```

---

## 4. End-to-End Data Flow

```
   [ Product Form / CSV Bulk Import ]
                 │
                 ▼
   [ Cost Engine (resolveProductCost) ]
                 │
                 ├──▶ `purchase_cost` (Supplier Price)
                 ├──▶ `additional_cost` (Overhead)
                 ├──▶ `cost_breakdown` (JSONB)
                 └──▶ `buy_price` = Landed Cost (Canonical)
                 │
                 ▼
          [ Database ]
                 │
        ┌────────┴───────────────────┐
        ▼                            ▼
   [ POS Sale ]               [ Inventory Ledger ]
   - Snapshot `unit_cost`     - Valuation = `stock * landed_cost`
   - Snapshot `profit`
   - Immutable Historical
     Sale Record
        │
        ▼
   [ Reports ]
   - Revenue vs COGS
   - Purchase Cost vs Additional Cost Breakdown
   - Gross Margin %
```

---

## 5. Distinction: Product Acquisition Cost vs Operating Expenses

* **Product Acquisition Cost (Included in Landed Cost):** Direct, unit-attributable costs required to acquire and prepare inventory for sale (e.g., product packaging, shipping freight, customs, physical handling).
* **Operating Expenses (Excluded from Landed Cost):** General store overheads (employee salaries, shop rent, electricity, marketing). These are recorded in the `expenses` table and do not alter individual product unit landed cost.

---

## 6. Migration & Backward Compatibility Strategy

Migration `20260915000013_product_cost_structure.sql`:
1. Safely adds `purchase_cost`, `additional_cost`, and `cost_breakdown` to `products`, `master_products`, `store_products`, and `sale_items`.
2. Backfills existing records with `purchase_cost = buy_price` and `additional_cost = 0`.
3. Ensures all existing queries, POS checkout flows, reports, and invoices referencing `buy_price` continue to operate with 0 disruption.

---

## 7. Verification Test Suite

77 automated test cases pass across 10 suites:
1. Purchase cost only calculation
2. Purchase + additional cost calculation
3. Zero additional cost edge cases
4. Multiple structured cost categories summing
5. Bulk purchase allocation
6. Fractional rounding safety (2 decimal places)
7. Gross profit calculation & negative margin (loss) detection
8. Gross margin percentage
9. Product update cost recalculation
10. Historical sale snapshot immutability
11. Inventory valuation using Landed Cost
12. Reports financial aggregation (Revenue, Landed Cost, Purchase Cost, Overheads, Margin)
13. Backward compatibility fallback with legacy products having only `buy_price`

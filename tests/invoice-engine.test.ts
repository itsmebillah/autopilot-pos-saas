import { describe, it, expect } from "vitest";
import {
  buildInvoiceData,
  formatCurrency,
  generateInvoiceNumber,
} from "../lib/invoice-engine";

describe("Invoice Engine & Currency Rendering Tests", () => {
  it("should format currency with proper spacing and position across international currencies", () => {
    // BDT BEFORE
    expect(formatCurrency(2500, { currency_symbol: "৳", currency_position: "BEFORE" })).toBe("৳ 2,500.00");
    // BDT AFTER
    expect(formatCurrency(2500, { currency_symbol: "৳", currency_position: "AFTER" })).toBe("2,500.00 ৳");
    // USD BEFORE
    expect(formatCurrency(2500, { currency_symbol: "$", currency_position: "BEFORE" })).toBe("$ 2,500.00");
    // EUR AFTER
    expect(formatCurrency(2500, { currency_symbol: "€", currency_position: "AFTER" })).toBe("2,500.00 €");
    // GBP BEFORE
    expect(formatCurrency(2500, { currency_symbol: "£", currency_position: "BEFORE" })).toBe("£ 2,500.00");
    // INR BEFORE
    expect(formatCurrency(2500, { currency_symbol: "₹", currency_position: "BEFORE" })).toBe("₹ 2,500.00");
    // AED BEFORE
    expect(formatCurrency(2500, { currency_symbol: "AED", currency_position: "BEFORE" })).toBe("AED 2,500.00");
  });

  it("should format negative amounts (e.g. discounts) without character collision", () => {
    expect(formatCurrency(-50, { currency_symbol: "৳", currency_position: "BEFORE" })).toBe("-৳ 50.00");
    expect(formatCurrency(-50, { currency_symbol: "€", currency_position: "AFTER" })).toBe("-50.00 €");
  });

  it("should format various magnitudes and decimal prices accurately", () => {
    const config = { currency_symbol: "৳", currency_position: "BEFORE" as const };
    expect(formatCurrency(0, config)).toBe("৳ 0.00");
    expect(formatCurrency(999, config)).toBe("৳ 999.00");
    expect(formatCurrency(12500, config)).toBe("৳ 12,500.00");
    expect(formatCurrency(125000, config)).toBe("৳ 125,000.00");
    expect(formatCurrency(1250000.5, config)).toBe("৳ 1,250,000.50");
  });

  it("should calculate exact arithmetic for line items and totals", () => {
    // Qty = 1, Unit Price = 2,500 -> Line Total = 2,500
    // Qty = 3, Unit Price = 550 -> Line Total = 1,650
    const rawSale = {
      id: "sale-calc-1",
      invoice_no: "INV-CALC-001",
      total: 4150,
      paid_amount: 5000,
      change_amount: 850,
      due_amount: 0,
    };

    const rawItems = [
      { id: "item-1", name: "Premium Geisha Coffee 1kg", quantity: 1, unit_price: 2500 },
      { id: "item-2", name: "Arabica Blend 250g", quantity: 3, unit_price: 550 },
    ];

    const invoice = buildInvoiceData(rawSale, rawItems, [], { currency: "৳" });

    expect(invoice.items[0].subtotal).toBe(2500);
    expect(invoice.items[0].total).toBe(2500);
    expect(invoice.items[1].subtotal).toBe(1650);
    expect(invoice.items[1].total).toBe(1650);
    expect(invoice.totals.subtotal).toBe(4150);
    expect(invoice.totals.grand_total).toBe(4150);
    expect(invoice.totals.paid_amount).toBe(5000);
    expect(invoice.totals.change_amount).toBe(850);
  });

  it("Acceptance Test: matches exact required invoice scenario with discount", () => {
    // Required Acceptance Test:
    // Product: Premium Geisha Coffee 1kg
    // Qty: 1, Unit Price: ৳2,500.00, Discount: ৳50.00, Tax: ৳0.00
    // Expected: Subtotal ৳2,500.00, Discount -৳50.00, Grand Total ৳2,450.00, Paid ৳2,450.00, Change ৳0.00
    const rawSale = {
      id: "sale-acceptance-1",
      invoice_no: "INV-STA-20260915-9999",
      customer_name: "Coffee Enthusiast",
      discount_amount: 50,
      tax_amount: 0,
      total: 2450,
      paid_amount: 2450,
      change_amount: 0,
      due_amount: 0,
      payment_status: "PAID",
    };

    const rawItems = [
      {
        id: "item-g1",
        name: "Premium Geisha Coffee 1kg",
        quantity: 1,
        unit_price: 2500,
        discount_amount: 50,
        tax_amount: 0,
        total: 2450,
      },
    ];

    const settings = {
      store_name: "Artisan Coffee Roasters",
      currency: "৳",
      currency_code: "BDT",
      currency_position: "BEFORE",
      receipt_footer: "Thank you for shopping with us! Please come again.",
    };

    const invoice = buildInvoiceData(rawSale, rawItems, [{ method: "CASH", amount: 2450 }], settings);

    expect(formatCurrency(invoice.totals.subtotal, invoice.config)).toBe("৳ 2,500.00");
    expect(formatCurrency(-invoice.totals.discount_total, invoice.config)).toBe("-৳ 50.00");
    expect(formatCurrency(invoice.totals.grand_total, invoice.config)).toBe("৳ 2,450.00");
    expect(formatCurrency(invoice.totals.paid_amount, invoice.config)).toBe("৳ 2,450.00");
    expect(formatCurrency(invoice.totals.change_amount, invoice.config)).toBe("৳ 0.00");
    expect(formatCurrency(invoice.totals.due_amount, invoice.config)).toBe("৳ 0.00");
  });

  it("should generate unique sequential invoice numbers with store code", () => {
    const inv1 = generateInvoiceNumber("STA");
    const inv2 = generateInvoiceNumber("STA");
    expect(inv1).toMatch(/^INV-STA-\d{8}-\d{4}$/);
    expect(inv2).toMatch(/^INV-STA-\d{8}-\d{4}$/);
    expect(inv1).not.toBe(inv2);
  });

  it("should handle walk-in anonymous customers gracefully", () => {
    const rawSale = {
      id: "sale-102",
      invoice_no: "INV-STA-20260915-1002",
      total: 50,
      paid_amount: 50,
    };

    const rawItems = [
      {
        id: "item-2",
        name: "Wireless Mouse",
        quantity: 1,
        unit_price: 50,
      },
    ];

    const invoice = buildInvoiceData(rawSale, rawItems, [], {});
    expect(invoice.customer).toBeNull();
    expect(invoice.totals.grand_total).toBe(50);
    expect(invoice.totals.paid_amount).toBe(50);
    expect(invoice.totals.due_amount).toBe(0);
  });

  it("should preserve historical snapshot even if current catalog has changed", () => {
    const historicalSale = {
      id: "sale-old",
      invoice_no: "INV-HISTORICAL-01",
      total: 200,
    };

    const historicalLineItems = [
      {
        product_id: "prod-1",
        product_name: "Original Product Title V1",
        unit_price: 200,
        quantity: 1,
        total: 200,
      },
    ];

    const invoice = buildInvoiceData(historicalSale, historicalLineItems, [], {});

    expect(invoice.items[0].name).toBe("Original Product Title V1");
    expect(invoice.items[0].unit_price).toBe(200);
    expect(invoice.totals.grand_total).toBe(200);
  });

  it("should handle batch tracking and expiry dates on line items", () => {
    const rawSale = { id: "sale-103", invoice_no: "INV-BATCH-01", total: 120 };
    const rawItems = [
      {
        id: "item-3",
        product_name: "Paracetamol 500mg Box",
        quantity: 2,
        unit_price: 60,
        batch_number: "BATCH-2026-X9",
        expiry_date: "2028-12-31",
      },
    ];

    const invoice = buildInvoiceData(rawSale, rawItems, [], {});
    expect(invoice.items[0].batch_number).toBe("BATCH-2026-X9");
    expect(invoice.items[0].expiry_date).toBe("2028-12-31");
  });
});

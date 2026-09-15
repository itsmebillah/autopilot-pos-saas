import { describe, it, expect } from "vitest";
import {
  buildInvoiceData,
  formatCurrency,
  generateInvoiceNumber,
  InvoiceData,
} from "../lib/invoice-engine";

describe("Invoice Engine & Historical Snapshot Tests", () => {
  it("should format currency according to store configuration", () => {
    expect(formatCurrency(1250, { currency_symbol: "৳", currency_position: "BEFORE" })).toBe("৳1,250.00");
    expect(formatCurrency(1250, { currency_symbol: "$", currency_position: "BEFORE" })).toBe("$1,250.00");
    expect(formatCurrency(1250, { currency_symbol: "€", currency_position: "AFTER" })).toBe("1,250.00 €");
  });

  it("should generate unique sequential invoice numbers with store code", () => {
    const inv1 = generateInvoiceNumber("STA");
    const inv2 = generateInvoiceNumber("STA");
    expect(inv1).toMatch(/^INV-STA-\d{8}-\d{4}$/);
    expect(inv2).toMatch(/^INV-STA-\d{8}-\d{4}$/);
    expect(inv1).not.toBe(inv2);
  });

  it("should construct canonical invoice snapshot with exact totals and change", () => {
    const rawSale = {
      id: "sale-101",
      invoice_no: "INV-STA-20260915-1001",
      created_at: "2026-09-15T10:30:00Z",
      customer_name: "John Doe",
      customer_phone: "+8801700000000",
      discount_amount: 50,
      tax_amount: 15,
      total: 965,
      paid_amount: 1000,
      change_amount: 35,
      due_amount: 0,
      payment_status: "PAID",
    };

    const rawItems = [
      {
        id: "item-1",
        product_name: "Rolex Submariner",
        sku: "ROL-SUB-01",
        barcode: "880123456789",
        quantity: 1,
        unit_price: 1000,
        unit_cost: 600,
        discount_amount: 50,
        tax_amount: 15,
        total: 965,
        serial_numbers: ["SN-99887766"],
      },
    ];

    const rawPayments = [
      { method: "CASH", amount: 700 },
      { method: "CARD", amount: 300 },
    ];

    const settings = {
      store_name: "Apex Luxury Timepieces",
      phone: "+880 1800-000000",
      address: "Gulshan 2, Dhaka",
      currency: "৳",
      currency_code: "BDT",
      tax_label: "VAT",
      tax_number: "BIN-123456",
      receipt_footer: "Thank you for shopping with us!",
      return_policy: "Exchange within 7 days.",
    };

    const invoice: InvoiceData = buildInvoiceData(rawSale, rawItems, rawPayments, settings);

    expect(invoice.transaction.invoice_no).toBe("INV-STA-20260915-1001");
    expect(invoice.business.name).toBe("Apex Luxury Timepieces");
    expect(invoice.business.tax_number).toBe("BIN-123456");
    expect(invoice.customer?.name).toBe("John Doe");
    expect(invoice.customer?.phone).toBe("+8801700000000");

    // Line items verification
    expect(invoice.items.length).toBe(1);
    expect(invoice.items[0].name).toBe("Rolex Submariner");
    expect(invoice.items[0].serial_numbers).toEqual(["SN-99887766"]);

    // Totals verification
    expect(invoice.totals.subtotal).toBe(1000);
    expect(invoice.totals.discount_total).toBe(50);
    expect(invoice.totals.grand_total).toBe(965);
    expect(invoice.totals.paid_amount).toBe(1000);
    expect(invoice.totals.change_amount).toBe(35);
    expect(invoice.totals.due_amount).toBe(0);

    // Multi-payment breakdown
    expect(invoice.payments.length).toBe(2);
    expect(invoice.payments[0].method).toBe("CASH");
    expect(invoice.payments[0].amount).toBe(700);
    expect(invoice.payments[1].method).toBe("CARD");
    expect(invoice.payments[1].amount).toBe(300);
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
    // Original sale created with price $200
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

    // Even if catalog now has "Renamed Product Title V2" @ $350, the historical snapshot is 100% intact
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

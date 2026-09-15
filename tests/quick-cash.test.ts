import { describe, it, expect } from "vitest";
import { generateQuickCashPresets, calculatePaymentSummary } from "../lib/quick-cash";

describe("Quick Cash Preset Generator", () => {
  it("generates adaptive presets for 2120 payable", () => {
    const presets = generateQuickCashPresets(2120);
    expect(presets[0]).toBe(2120); // Exact
    expect(presets).toContain(2500);
    expect(presets).toContain(3000);
    expect(presets).toContain(5000);
    expect(presets.length).toBeLessThanOrEqual(4);
  });

  it("generates adaptive presets for 850 payable", () => {
    const presets = generateQuickCashPresets(850);
    expect(presets[0]).toBe(850); // Exact
    expect(presets.some((p) => p >= 1000)).toBe(true);
    expect(presets.length).toBeGreaterThanOrEqual(2);
  });

  it("generates adaptive presets for 12,700 payable", () => {
    const presets = generateQuickCashPresets(12700);
    expect(presets[0]).toBe(12700); // Exact
    expect(presets).toContain(13000);
    expect(presets).toContain(15000);
    expect(presets).toContain(20000);
  });

  it("handles zero and edge payable amounts cleanly", () => {
    expect(generateQuickCashPresets(0)).toEqual([0]);
    expect(generateQuickCashPresets(-50)).toEqual([0]);
  });
});

describe("Payment Financial Summary & Synchronization", () => {
  it("Scenario 1: Exact payment (Payable 2120, Paid 2120)", () => {
    const summary = calculatePaymentSummary(2120, 2120);
    expect(summary.paid).toBe(2120);
    expect(summary.change).toBe(0);
    expect(summary.due).toBe(0);
    expect(summary.isFullyPaid).toBe(true);
  });

  it("Scenario 2: Preset 2500 click (Payable 2120, Paid 2500)", () => {
    const summary = calculatePaymentSummary(2120, 2500);
    expect(summary.paid).toBe(2500);
    expect(summary.change).toBe(380);
    expect(summary.due).toBe(0);
    expect(summary.isFullyPaid).toBe(true);
  });

  it("Scenario 3: Manual 5000 tender (Payable 2120, Paid 5000)", () => {
    const summary = calculatePaymentSummary(2120, 5000);
    expect(summary.paid).toBe(5000);
    expect(summary.change).toBe(2880);
    expect(summary.due).toBe(0);
    expect(summary.isFullyPaid).toBe(true);
  });

  it("Scenario 4: Partial 2000 tender (Payable 2120, Paid 2000)", () => {
    const summary = calculatePaymentSummary(2120, 2000);
    expect(summary.paid).toBe(2000);
    expect(summary.change).toBe(0);
    expect(summary.due).toBe(120);
    expect(summary.isFullyPaid).toBe(false);
  });

  it("never produces simultaneous positive change and positive due", () => {
    const testCases = [
      { payable: 1000, paid: 500 },
      { payable: 1000, paid: 1000 },
      { payable: 1000, paid: 1500 },
      { payable: 2120, paid: 0 },
      { payable: 2120, paid: 25000 },
    ];

    testCases.forEach(({ payable, paid }) => {
      const summary = calculatePaymentSummary(payable, paid);
      expect(summary.change >= 0).toBe(true);
      expect(summary.due >= 0).toBe(true);
      expect(summary.change > 0 && summary.due > 0).toBe(false);
    });
  });

  it("guards against NaN, null, and negative inputs safely", () => {
    const summary = calculatePaymentSummary(Number("invalid"), -500);
    expect(summary.payable).toBe(0);
    expect(summary.paid).toBe(0);
    expect(summary.change).toBe(0);
    expect(summary.due).toBe(0);
  });
});

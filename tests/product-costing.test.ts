import { describe, it, expect } from "vitest";
import {
  calculateLandedCost,
  sumCostBreakdown,
  calculateProfitAndMargin,
  resolveProductCost,
  calculateBulkAllocation,
  roundCurrency,
} from "../lib/product-costing";

describe("Product Cost Structure & Landed Cost Engine", () => {
  // Scenario 1: Purchase cost only
  it("Scenario 1: correctly calculates landed cost with purchase cost only", () => {
    const landedCost = calculateLandedCost(1000, 0);
    expect(landedCost).toBe(1000);

    const resolved = resolveProductCost({
      purchase_cost: 1000,
      additional_cost: 0,
      sell_price: 1500,
    });
    expect(resolved.purchaseCost).toBe(1000);
    expect(resolved.additionalCost).toBe(0);
    expect(resolved.landedCost).toBe(1000);
    expect(resolved.grossProfit).toBe(500);
    expect(resolved.grossMarginPercentage).toBe(33.33);
  });

  // Scenario 2: Purchase + additional cost
  it("Scenario 2: correctly calculates landed cost with purchase cost + additional cost", () => {
    // Requirement example: Purchase Cost = 1,000, Additional Cost = 35 -> Total Cost = 1,035
    const landedCost = calculateLandedCost(1000, 35);
    expect(landedCost).toBe(1035);

    const resolved = resolveProductCost({
      purchase_cost: 1000,
      additional_cost: 35,
      sell_price: 1500,
    });
    expect(resolved.purchaseCost).toBe(1000);
    expect(resolved.additionalCost).toBe(35);
    expect(resolved.landedCost).toBe(1035);
    expect(resolved.grossProfit).toBe(465);
    expect(resolved.grossMarginPercentage).toBe(31);
  });

  // Scenario 3: Zero additional cost
  it("Scenario 3: handles zero additional cost properly without floating point distortion", () => {
    const landedCost = calculateLandedCost(250.5, 0);
    expect(landedCost).toBe(250.5);

    const resolved = resolveProductCost({
      purchase_cost: "250.50",
      additional_cost: "0",
      sell_price: "300.00",
    });
    expect(resolved.landedCost).toBe(250.5);
    expect(resolved.grossProfit).toBe(49.5);
  });

  // Scenario 4: Multiple additional cost categories
  it("Scenario 4: sums multiple structured additional cost categories correctly", () => {
    const breakdown = {
      packaging: 20,
      transport: 10,
      handling: 5,
      customization: 15,
      other: 5,
    };
    const totalAdditional = sumCostBreakdown(breakdown);
    expect(totalAdditional).toBe(55);

    const resolved = resolveProductCost({
      purchase_cost: 500,
      cost_breakdown: breakdown,
      sell_price: 750,
    });
    expect(resolved.additionalCost).toBe(55);
    expect(resolved.landedCost).toBe(555);
    expect(resolved.grossProfit).toBe(195);
    expect(resolved.grossMarginPercentage).toBe(26);
  });

  // Scenario 5: Bulk quantity allocation
  it("Scenario 5: allocates bulk purchase additional costs across quantity", () => {
    // Requirement example:
    // 100 units, Purchase cost = 100 * 100 = 10,000
    // Additional costs: Transport = 500, Packaging = 300 (Total additional = 800)
    // Total acquisition = 10,800, Per-unit landed = 108
    const result = calculateBulkAllocation({
      quantity: 100,
      purchaseCostPerUnit: 100,
      batchCostBreakdown: {
        transport: 500,
        packaging: 300,
      },
    });

    expect(result.quantity).toBe(100);
    expect(result.totalPurchaseCost).toBe(10000);
    expect(result.totalAdditionalCost).toBe(800);
    expect(result.totalBatchCost).toBe(10800);
    expect(result.allocatedAdditionalCostPerUnit).toBe(8);
    expect(result.unitLandedCost).toBe(108);
    expect(result.perUnitBreakdown.transport).toBe(5);
    expect(result.perUnitBreakdown.packaging).toBe(3);
  });

  // Scenario 6: Additional cost allocation with odd quantity rounding
  it("Scenario 6: handles fractional per-unit bulk allocation with standard 2-decimal precision", () => {
    // 3 units, total additional cost = 10 (3.3333... per unit)
    const result = calculateBulkAllocation({
      quantity: 3,
      purchaseCostPerUnit: 50,
      totalBatchAdditionalCost: 10,
    });

    expect(result.allocatedAdditionalCostPerUnit).toBe(3.33);
    expect(result.unitLandedCost).toBe(53.33);
  });

  // Scenario 7: Profit calculation
  it("Scenario 7: calculates gross profit accurately as Selling Price - Landed Cost", () => {
    // Selling Price = 1500, Total Landed Cost = 1035 -> Profit = 465
    const { grossProfit } = calculateProfitAndMargin(1500, 1035);
    expect(grossProfit).toBe(465);

    // Negative profit (loss) scenario
    const lossResult = calculateProfitAndMargin(800, 1035);
    expect(lossResult.grossProfit).toBe(-235);
  });

  // Scenario 8: Margin calculation
  it("Scenario 8: calculates gross margin percentage accurately", () => {
    // Selling Price = 1500, Gross Profit = 465 -> Margin = (465 / 1500) * 100 = 31%
    const { grossMarginPercentage } = calculateProfitAndMargin(1500, 1035);
    expect(grossMarginPercentage).toBe(31);

    // Zero sell price scenario returns 0% margin safely
    const zeroSell = calculateProfitAndMargin(0, 100);
    expect(zeroSell.grossMarginPercentage).toBe(0);
  });

  // Scenario 9: Product update cost recalculation
  it("Scenario 9: updates cost and profit metrics when product costs change", () => {
    const original = resolveProductCost({
      purchase_cost: 1000,
      additional_cost: 35,
      sell_price: 1500,
    });
    expect(original.landedCost).toBe(1035);

    // Supplier increases price to 1100 and packaging to 50
    const updated = resolveProductCost({
      purchase_cost: 1100,
      additional_cost: 50,
      sell_price: 1500,
    });
    expect(updated.landedCost).toBe(1150);
    expect(updated.grossProfit).toBe(350);
    expect(updated.grossMarginPercentage).toBe(23.33);
  });

  // Scenario 10: Historical sale cost snapshot immutability
  it("Scenario 10: historical sales preserve immutable snapshot unit_cost", () => {
    // Product at sale time:
    const productAtSaleTime = resolveProductCost({
      purchase_cost: 1000,
      additional_cost: 35,
      sell_price: 1500,
    });

    const historicalSaleItem = {
      product_id: "prod-1",
      quantity: 2,
      unit_price: productAtSaleTime.sellPrice,
      unit_cost: productAtSaleTime.landedCost, // Snapshot = 1035
      subtotal: 3000,
      profit: (productAtSaleTime.sellPrice - productAtSaleTime.landedCost) * 2, // 930
    };

    // Later, the product cost is edited in catalog:
    const updatedProduct = resolveProductCost({
      purchase_cost: 1200,
      additional_cost: 100,
      sell_price: 1600,
    });

    // Historical sale record remains unchanged:
    expect(historicalSaleItem.unit_cost).toBe(1035);
    expect(historicalSaleItem.profit).toBe(930);
    expect(updatedProduct.landedCost).toBe(1300);
  });

  // Scenario 11: Inventory valuation
  it("Scenario 11: evaluates inventory using authoritative Landed Cost", () => {
    const productsInStock = [
      { stock: 10, purchase_cost: 1000, additional_cost: 35 }, // Landed: 1035, Value: 10,350
      { stock: 50, purchase_cost: 200, additional_cost: 10 },  // Landed: 210, Value: 10,500
      { stock: 5, purchase_cost: 500, additional_cost: 0 },    // Landed: 500, Value: 2,500
    ];

    const totalValuation = productsInStock.reduce((sum, p) => {
      const landed = calculateLandedCost(p.purchase_cost, p.additional_cost);
      return sum + landed * p.stock;
    }, 0);

    expect(totalValuation).toBe(23350);
  });

  // Scenario 12: Reports summary calculations
  it("Scenario 12: calculates reports financial metrics from sales and costs", () => {
    const saleTransactions = [
      { revenue: 1500, landedCost: 1035, purchaseCost: 1000, additionalCost: 35 },
      { revenue: 3000, landedCost: 2070, purchaseCost: 2000, additionalCost: 70 },
    ];

    const totalRevenue = saleTransactions.reduce((s, t) => s + t.revenue, 0);
    const totalLandedCost = saleTransactions.reduce((s, t) => s + t.landedCost, 0);
    const totalPurchaseCost = saleTransactions.reduce((s, t) => s + t.purchaseCost, 0);
    const totalAdditionalCost = saleTransactions.reduce((s, t) => s + t.additionalCost, 0);
    const grossProfit = totalRevenue - totalLandedCost;
    const grossMargin = roundCurrency((grossProfit / totalRevenue) * 100);

    expect(totalRevenue).toBe(4500);
    expect(totalLandedCost).toBe(3105);
    expect(totalPurchaseCost).toBe(3000);
    expect(totalAdditionalCost).toBe(105);
    expect(grossProfit).toBe(1395);
    expect(grossMargin).toBe(31);
  });

  // Scenario 13: Backward compatibility with legacy products having only buy_price
  it("Scenario 13: falls back seamlessly to legacy buy_price as purchase_cost with 0 additional_cost", () => {
    const legacyProduct = {
      name: "Legacy Widget",
      buy_price: 450,
      sell_price: 600,
    };

    const resolved = resolveProductCost(legacyProduct);
    expect(resolved.purchaseCost).toBe(450);
    expect(resolved.additionalCost).toBe(0);
    expect(resolved.landedCost).toBe(450);
    expect(resolved.grossProfit).toBe(150);
    expect(resolved.grossMarginPercentage).toBe(25);
  });
});

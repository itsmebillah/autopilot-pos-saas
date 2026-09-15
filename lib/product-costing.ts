/**
 * Autopilot POS SaaS — Product Costing & Landed Cost Engine
 * 
 * Core Formula:
 * Landed Cost (Total Cost) = Purchase Cost (Supplier Price) + Additional Cost (Packaging, Transport, Handling, etc.)
 * Gross Profit = Selling Price - Landed Cost
 * Gross Margin % = (Gross Profit / Selling Price) * 100
 */

export interface CostBreakdown {
  packaging?: number;
  transport?: number;
  handling?: number;
  customization?: number;
  other?: number;
  [customCategory: string]: number | undefined;
}

export interface ProductCostInput {
  purchase_cost?: number | string | null;
  additional_cost?: number | string | null;
  cost_breakdown?: CostBreakdown | null;
  buy_price?: number | string | null; // Canonical Landed Cost for backward compatibility
  sell_price?: number | string | null;
}

export interface ProductCostResolution {
  purchaseCost: number;
  additionalCost: number;
  costBreakdown: CostBreakdown;
  landedCost: number; // Stored in `buy_price`
  sellPrice: number;
  grossProfit: number;
  grossMarginPercentage: number;
}

export interface BulkAllocationInput {
  quantity: number;
  purchaseCostPerUnit: number;
  totalBatchAdditionalCost?: number;
  batchCostBreakdown?: CostBreakdown;
}

export interface BulkAllocationResult {
  quantity: number;
  purchaseCostPerUnit: number;
  totalPurchaseCost: number;
  totalAdditionalCost: number;
  totalBatchCost: number;
  allocatedAdditionalCostPerUnit: number;
  unitLandedCost: number;
  perUnitBreakdown: CostBreakdown;
}

/**
 * Rounds a number safely to specified decimal places (default 2)
 */
export function roundCurrency(amount: number, decimals: number = 2): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates the total of structured additional cost categories
 */
export function sumCostBreakdown(breakdown?: CostBreakdown | null): number {
  if (!breakdown || typeof breakdown !== "object") return 0;
  let total = 0;
  for (const key of Object.keys(breakdown)) {
    const val = Number(breakdown[key]);
    if (!isNaN(val) && val > 0) {
      total += val;
    }
  }
  return roundCurrency(total);
}

/**
 * Calculates Total/Landed Cost: Purchase Cost + Additional Cost
 */
export function calculateLandedCost(
  purchaseCost: number | string | null | undefined,
  additionalCost: number | string | null | undefined
): number {
  const p = Math.max(0, Number(purchaseCost) || 0);
  const a = Math.max(0, Number(additionalCost) || 0);
  return roundCurrency(p + a);
}

/**
 * Calculates Gross Profit and Margin Percentage based on Landed Cost
 */
export function calculateProfitAndMargin(
  sellPrice: number | string | null | undefined,
  landedCost: number | string | null | undefined
): { grossProfit: number; grossMarginPercentage: number } {
  const sell = Number(sellPrice) || 0;
  const cost = Number(landedCost) || 0;
  const grossProfit = roundCurrency(sell - cost);
  const grossMarginPercentage =
    sell > 0 ? roundCurrency((grossProfit / sell) * 100) : 0;

  return {
    grossProfit,
    grossMarginPercentage,
  };
}

/**
 * Resolves full cost structure with backward-compatible fallback to `buy_price`
 */
export function resolveProductCost(input: ProductCostInput): ProductCostResolution {
  const rawBuyPrice = Number(input.buy_price) || 0;
  let purchaseCost = input.purchase_cost !== undefined && input.purchase_cost !== null
    ? Number(input.purchase_cost) || 0
    : 0;
  
  const breakdown: CostBreakdown = input.cost_breakdown && typeof input.cost_breakdown === "object"
    ? { ...input.cost_breakdown }
    : {};

  let additionalCost = input.additional_cost !== undefined && input.additional_cost !== null
    ? Number(input.additional_cost) || 0
    : sumCostBreakdown(breakdown);

  // If breakdown has items but additionalCost is 0, sum from breakdown
  const breakdownSum = sumCostBreakdown(breakdown);
  if (breakdownSum > 0 && additionalCost === 0) {
    additionalCost = breakdownSum;
  }

  // Backward compatibility fallback:
  // If purchase_cost is not provided or 0, but buy_price is present, treat buy_price as purchase_cost
  if (purchaseCost === 0 && additionalCost === 0 && rawBuyPrice > 0) {
    purchaseCost = rawBuyPrice;
  }

  const landedCost = calculateLandedCost(purchaseCost, additionalCost);
  const sellPrice = Number(input.sell_price) || 0;
  const { grossProfit, grossMarginPercentage } = calculateProfitAndMargin(sellPrice, landedCost);

  return {
    purchaseCost: roundCurrency(purchaseCost),
    additionalCost: roundCurrency(additionalCost),
    costBreakdown: breakdown,
    landedCost,
    sellPrice: roundCurrency(sellPrice),
    grossProfit,
    grossMarginPercentage,
  };
}

/**
 * Allocates batch additional cost across quantities for bulk purchases
 * Example: 100 units @ ৳100 purchase price + ৳800 batch additional cost (Transport ৳500, Packaging ৳300)
 * -> Total acquisition: ৳10,800
 * -> Per-unit additional: ৳8.00
 * -> Per-unit landed: ৳108.00
 */
export function calculateBulkAllocation(input: BulkAllocationInput): BulkAllocationResult {
  const qty = Math.max(1, Number(input.quantity) || 1);
  const purchaseCostPerUnit = Math.max(0, Number(input.purchaseCostPerUnit) || 0);
  const totalPurchaseCost = roundCurrency(purchaseCostPerUnit * qty);

  let totalAdditionalCost = 0;
  const perUnitBreakdown: CostBreakdown = {};

  if (input.batchCostBreakdown) {
    for (const [cat, val] of Object.entries(input.batchCostBreakdown)) {
      const numVal = Number(val) || 0;
      if (numVal > 0) {
        totalAdditionalCost += numVal;
        perUnitBreakdown[cat] = roundCurrency(numVal / qty);
      }
    }
  } else if (input.totalBatchAdditionalCost !== undefined) {
    totalAdditionalCost = Math.max(0, Number(input.totalBatchAdditionalCost) || 0);
  }

  totalAdditionalCost = roundCurrency(totalAdditionalCost);
  const allocatedAdditionalCostPerUnit = roundCurrency(totalAdditionalCost / qty);
  const totalBatchCost = roundCurrency(totalPurchaseCost + totalAdditionalCost);
  const unitLandedCost = roundCurrency(purchaseCostPerUnit + allocatedAdditionalCostPerUnit);

  return {
    quantity: qty,
    purchaseCostPerUnit,
    totalPurchaseCost,
    totalAdditionalCost,
    totalBatchCost,
    allocatedAdditionalCostPerUnit,
    unitLandedCost,
    perUnitBreakdown,
  };
}

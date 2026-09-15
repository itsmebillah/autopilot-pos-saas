import { describe, it, expect } from "vitest";

interface InventoryStockState {
  id: string;
  name: string;
  stock: number;
}

interface StockMovementRecord {
  id: string;
  product_id: string;
  movement_type: "PURCHASE_RECEIVE" | "DAMAGE_LOSS" | "AUDIT_ADJUSTMENT" | "SALE_DISPATCH";
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  notes?: string;
}

function processStockAdjustment(
  product: InventoryStockState,
  adjustType: "ADD" | "SUBTRACT" | "SET",
  quantity: number,
  reason: "PURCHASE_RECEIVE" | "DAMAGE_LOSS" | "AUDIT_ADJUSTMENT",
  notes?: string
): { updatedProduct: InventoryStockState; ledgerEntry: StockMovementRecord } {
  if (quantity < 0) {
    throw new Error("Quantity must be non-negative");
  }

  const previous_stock = product.stock;
  let new_stock = previous_stock;
  let quantityDelta = 0;

  if (adjustType === "ADD") {
    new_stock = previous_stock + quantity;
    quantityDelta = quantity;
  } else if (adjustType === "SUBTRACT") {
    new_stock = previous_stock - quantity;
    quantityDelta = -quantity;
  } else if (adjustType === "SET") {
    new_stock = quantity;
    quantityDelta = quantity - previous_stock;
  }

  if (new_stock < 0) {
    throw new Error("Stock level cannot be negative");
  }

  const updatedProduct: InventoryStockState = {
    ...product,
    stock: new_stock,
  };

  const ledgerEntry: StockMovementRecord = {
    id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    product_id: product.id,
    movement_type: reason,
    quantity: quantityDelta,
    previous_stock,
    new_stock,
    reason,
    notes,
  };

  return { updatedProduct, ledgerEntry };
}

describe("Auditable Inventory Ledger Engine", () => {
  it("processes PURCHASE_RECEIVE stock addition and writes positive ledger record", () => {
    const item: InventoryStockState = { id: "p-01", name: "Seiko 5 Automatic", stock: 10 };
    const { updatedProduct, ledgerEntry } = processStockAdjustment(
      item,
      "ADD",
      15,
      "PURCHASE_RECEIVE",
      "PO-2026-09"
    );

    expect(updatedProduct.stock).toBe(25);
    expect(ledgerEntry.quantity).toBe(15);
    expect(ledgerEntry.previous_stock).toBe(10);
    expect(ledgerEntry.new_stock).toBe(25);
    expect(ledgerEntry.movement_type).toBe("PURCHASE_RECEIVE");
    expect(ledgerEntry.notes).toBe("PO-2026-09");
  });

  it("processes DAMAGE_LOSS stock deduction and writes negative ledger record", () => {
    const item: InventoryStockState = { id: "p-02", name: "Perfume Glass Bottle 100ml", stock: 12 };
    const { updatedProduct, ledgerEntry } = processStockAdjustment(
      item,
      "SUBTRACT",
      2,
      "DAMAGE_LOSS",
      "Broken during shelf restock"
    );

    expect(updatedProduct.stock).toBe(10);
    expect(ledgerEntry.quantity).toBe(-2);
    expect(ledgerEntry.previous_stock).toBe(12);
    expect(ledgerEntry.new_stock).toBe(10);
    expect(ledgerEntry.movement_type).toBe("DAMAGE_LOSS");
  });

  it("processes AUDIT_ADJUSTMENT to set exact physical inventory count", () => {
    const item: InventoryStockState = { id: "p-03", name: "USB-C Fast Cable 1m", stock: 45 };
    const { updatedProduct, ledgerEntry } = processStockAdjustment(
      item,
      "SET",
      40,
      "AUDIT_ADJUSTMENT",
      "Annual physical inventory count"
    );

    expect(updatedProduct.stock).toBe(40);
    expect(ledgerEntry.quantity).toBe(-5);
    expect(ledgerEntry.previous_stock).toBe(45);
    expect(ledgerEntry.new_stock).toBe(40);
  });

  it("prevents negative stock deductions", () => {
    const item: InventoryStockState = { id: "p-04", name: "Luxury Watch", stock: 3 };
    expect(() => {
      processStockAdjustment(item, "SUBTRACT", 5, "DAMAGE_LOSS");
    }).toThrowError("Stock level cannot be negative");
  });
});

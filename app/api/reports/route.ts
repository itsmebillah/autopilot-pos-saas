import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { roundCurrency } from "@/lib/product-costing";

export async function GET() {
  try {
    const session = await requireAuth();
    requireRole(session, ["owner", "manager"]);

    const [salesRes, productsRes, saleItemsRes] = await Promise.all([
      supabase.from("sales").select("*"),
      supabase.from("products").select("id, name, stock, purchase_cost, additional_cost, buy_price"),
      supabase.from("sale_items").select("*"),
    ]);

    const sales = salesRes.data || [];
    const products = productsRes.data || [];
    const saleItems = saleItemsRes.data || [];

    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let todaySales = 0;
    let monthlySales = 0;
    let totalSales = 0;
    let totalProfit = 0;
    let totalLandedCost = 0;
    let totalPurchaseCost = 0;
    let totalAdditionalCost = 0;

    sales.forEach((sale: any) => {
      const saleAmount = Number(sale.total || 0);
      totalSales += saleAmount;

      const saleDate = sale.created_at ? new Date(sale.created_at) : new Date();
      const saleDay = saleDate.toISOString().split("T")[0];

      if (saleDay === todayStr) {
        todaySales += saleAmount;
      }

      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        monthlySales += saleAmount;
      }
    });

    saleItems.forEach((item: any) => {
      const qty = Number(item.quantity) || 1;
      const unitCost = Number(item.unit_cost ?? item.cost ?? 0);
      const itemPurchaseCost = Number(item.purchase_cost ?? unitCost);
      const itemAdditionalCost = Number(item.additional_cost ?? 0);

      totalLandedCost += unitCost * qty;
      totalPurchaseCost += itemPurchaseCost * qty;
      totalAdditionalCost += itemAdditionalCost * qty;
      totalProfit += Number(item.profit || (Number(item.price ?? item.unit_price ?? 0) - unitCost) * qty);
    });

    // Inventory Valuation (Authoritative Landed Cost of on-hand inventory)
    let inventoryValuation = 0;
    let totalInventoryUnits = 0;
    products.forEach((p: any) => {
      const stock = Number(p.stock) || 0;
      const landed = Number(p.buy_price ?? (Number(p.purchase_cost || 0) + Number(p.additional_cost || 0)));
      if (stock > 0) {
        inventoryValuation += stock * landed;
        totalInventoryUnits += stock;
      }
    });

    const grossMarginPercent = totalSales > 0 ? roundCurrency((totalProfit / totalSales) * 100) : 0;
    const lowStock = products.filter((p: any) => Number(p.stock) <= 5).length;

    return NextResponse.json({
      success: true,
      todaySales: roundCurrency(todaySales),
      monthlySales: roundCurrency(monthlySales),
      totalSales: roundCurrency(totalSales),
      totalProfit: roundCurrency(totalProfit),
      totalLandedCost: roundCurrency(totalLandedCost),
      totalPurchaseCost: roundCurrency(totalPurchaseCost),
      totalAdditionalCost: roundCurrency(totalAdditionalCost),
      grossMarginPercent,
      inventoryValuation: roundCurrency(inventoryValuation),
      totalInventoryUnits,
      lowStock,
      totalOrders: sales.length,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to generate report",
      },
      { status: error.status || 500 }
    );
  }
}
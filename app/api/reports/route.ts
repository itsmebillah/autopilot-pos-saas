import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [salesRes, productsRes, saleItemsRes] = await Promise.all([
      supabase.from("sales").select("*"),
      supabase.from("products").select("id, stock"),
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
    let totalProfit = 0;

    sales.forEach((sale: any) => {
      const saleDate = sale.created_at ? new Date(sale.created_at) : new Date();
      const saleDay = saleDate.toISOString().split("T")[0];

      if (saleDay === todayStr) {
        todaySales += Number(sale.total || 0);
      }

      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        monthlySales += Number(sale.total || 0);
      }
    });

    saleItems.forEach((item: any) => {
      totalProfit += Number(item.profit || 0);
    });

    const lowStock = products.filter((p: any) => Number(p.stock) <= 5).length;

    return NextResponse.json({
      success: true,
      todaySales,
      monthlySales,
      totalProfit,
      lowStock,
      totalOrders: sales.length,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to generate report",
    });
  }
}
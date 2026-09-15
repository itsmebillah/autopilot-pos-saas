import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [productsRes, customersRes, salesRes] = await Promise.all([
      supabase.from("products").select("id, stock, sell_price"),
      supabase.from("customers").select("id"),
      supabase.from("sales").select("id, total"),
    ]);

    const products = productsRes.data || [];
    const customers = customersRes.data || [];
    const sales = salesRes.data || [];

    let totalSales = 0;
    sales.forEach((sale) => {
      totalSales += Number(sale.total || 0);
    });

    const lowStockProducts = products.filter((p) => Number(p.stock) <= 5).length;

    return NextResponse.json({
      success: true,
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalSales,
      lowStockProducts,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to load dashboard metrics",
    });
  }
}
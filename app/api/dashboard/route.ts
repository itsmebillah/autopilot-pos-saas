import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { requireShopAuth } from "@/lib/auth-guard";

export async function GET() {
  try {
    const session = await requireShopAuth();

    let salesQuery = supabase.from("sales").select("id, total");
    if (session.store?.id && session.store.id !== "00000000-0000-0000-0000-000000000000") {
      salesQuery = salesQuery.or(`store_id.eq.${session.store.id},store_id.is.null`);
    }

    const [productsRes, customersRes, salesRes] = await Promise.all([
      supabase.from("products").select("id, stock, sell_price"),
      supabase.from("customers").select("id"),
      salesQuery,
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
    const error = err as Error & { status?: number };
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to load dashboard metrics",
      },
      { status: error.status || 500 }
    );
  }
}
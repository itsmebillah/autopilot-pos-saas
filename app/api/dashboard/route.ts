import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {

  const { data: products } = await supabase
    .from("products")
    .select("*");

  const { data: customers } = await supabase
    .from("customers")
    .select("*");

  const { data: sales } = await supabase
    .from("sales")
    .select("*");

  let totalSales = 0;

  const lowStockProducts =
  products?.filter(
    (p) => Number(p.stock) <= 5
  ).length || 0;

  sales?.forEach((sale) => {
    totalSales += Number(sale.total || 0);
  });

  return NextResponse.json({
    success: true,
    totalProducts: products?.length || 0,
    totalCustomers: customers?.length || 0,
    totalSales,
    lowStockProducts,
  });
}
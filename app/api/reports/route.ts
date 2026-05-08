import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {

  try {

    // Sales
    const { data: sales } =
      await supabase
        .from("sales")
        .select("*");

    // Products
    const { data: products } =
      await supabase
        .from("products")
        .select("*");

    // Sale Items
    const { data: saleItems } =
      await supabase
        .from("sale_items")
        .select("*");

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    let todaySales = 0;

    let monthlySales = 0;

    let totalProfit = 0;

    sales?.forEach((sale: any) => {

      const saleDate =
        new Date(
          sale.created_at
        );

      const saleDay =
        saleDate
          .toISOString()
          .split("T")[0];

      if (saleDay === today) {

        todaySales +=
          Number(sale.total);

      }

      if (
        saleDate.getMonth() ===
        new Date().getMonth()
      ) {

        monthlySales +=
          Number(sale.total);

      }

    });

    saleItems?.forEach(
      (item: any) => {

        totalProfit +=
          Number(item.profit);

      }
    );

    const lowStock =
      products?.filter(
        (product: any) =>
          product.stock <= 5
      ).length || 0;

    return NextResponse.json({
      success: true,
      todaySales,
      monthlySales,
      totalProfit,
      lowStock,
    });

  } catch {

    return NextResponse.json({
      success: false,
      message: "Server Error",
    });

  }
}
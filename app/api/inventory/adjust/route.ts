import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, adjustType, quantity, reason, notes } = body;

    if (!productId) {
      return NextResponse.json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Fetch existing product
    const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (fetchErr || !product) {
      return NextResponse.json({
        success: false,
        message: "Product not found",
      });
    }

    const currentStock = Number(product.stock) || 0;
    const qty = Number(quantity) || 0;
    let newStock = currentStock;

    if (adjustType === "ADD") newStock = currentStock + qty;
    else if (adjustType === "SUBTRACT") newStock = currentStock - qty;
    else if (adjustType === "SET") newStock = qty;

    if (newStock < 0) {
      return NextResponse.json({
        success: false,
        message: "Resulting stock cannot be negative",
      });
    }

    // Update product stock
    const { error: updateErr } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", productId);

    if (updateErr) {
      return NextResponse.json({
        success: false,
        message: updateErr.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Stock updated to ${newStock} (${reason || "Manual Adjustment"}${notes ? ` - ${notes}` : ""})`,
      newStock,
      previousStock: currentStock,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({
      success: false,
      message: error.message || "Failed to adjust stock",
    });
  }
}

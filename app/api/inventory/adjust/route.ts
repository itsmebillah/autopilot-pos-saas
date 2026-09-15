import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    requireRole(session, ["owner", "manager", "inventory"]);

    const body = await req.json();
    const { productId, adjustType, quantity, reason, notes } = body;

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required",
        },
        { status: 400 }
      );
    }

    // Fetch existing product
    const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (fetchErr || !product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found",
        },
        { status: 404 }
      );
    }

    const currentStock = Number(product.stock) || 0;
    const qty = Number(quantity) || 0;
    let newStock = currentStock;

    if (adjustType === "ADD") newStock = currentStock + qty;
    else if (adjustType === "SUBTRACT") newStock = currentStock - qty;
    else if (adjustType === "SET") newStock = qty;

    if (newStock < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Resulting stock cannot be negative",
        },
        { status: 400 }
      );
    }

    // Update product stock
    const { error: updateErr } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", productId);

    if (updateErr) {
      return NextResponse.json(
        {
          success: false,
          message: updateErr.message,
        },
        { status: 500 }
      );
    }

    // Record immutable stock movement
    try {
      await supabase.from("stock_movements").insert([
        {
          movement_type: "ADJUSTMENT",
          quantity: newStock - currentStock,
          previous_stock: currentStock,
          new_stock: newStock,
          notes: `${reason || "MANUAL_ADJUSTMENT"}: ${notes || "Adjusted via inventory modal"} by ${session.profile.fullName}`,
        },
      ]);
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Stock updated to ${newStock} (${reason || "Manual Adjustment"}${notes ? ` - ${notes}` : ""})`,
      newStock,
      previousStock: currentStock,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to adjust stock",
      },
      { status: error.status || 500 }
    );
  }
}

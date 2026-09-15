import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { requireShopAuth, requireRole } from "@/lib/auth-guard";
import { resolveProductCost } from "@/lib/product-costing";

export async function POST(req: Request) {
  try {
    const session = await requireShopAuth();
    requireRole(session, ["owner", "manager", "inventory"]);

    const body = await req.json();
    const {
      id,
      name,
      barcode,
      category = "General",
      purchase_cost,
      additional_cost,
      cost_breakdown,
      buy_price = 0,
      sell_price = 0,
      stock = 0,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required for update" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Product name cannot be empty" },
        { status: 400 }
      );
    }

    const costResolution = resolveProductCost({
      purchase_cost,
      additional_cost,
      cost_breakdown,
      buy_price,
      sell_price,
    });

    const numericSellPrice = costResolution.sellPrice;
    const numericStock = parseFloat(stock) || 0;

    // Check barcode collision if barcode changed
    if (barcode && barcode.trim()) {
      const { data: existingBarcode } = await supabase
        .from("products")
        .select("id, name")
        .eq("barcode", barcode.trim())
        .neq("id", id)
        .limit(1);

      if (existingBarcode && existingBarcode.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Barcode "${barcode}" is already assigned to "${existingBarcode[0].name}".`,
          },
          { status: 409 }
        );
      }
    }

    const updatePayload: Record<string, any> = {
      name: name.trim(),
      barcode: barcode ? barcode.trim() : null,
      category: (category || "General").trim(),
      purchase_cost: costResolution.purchaseCost,
      additional_cost: costResolution.additionalCost,
      cost_breakdown: costResolution.costBreakdown,
      buy_price: costResolution.landedCost, // Canonical Landed Cost
      sell_price: numericSellPrice,
      stock: numericStock,
    };
    if (body.min_stock !== undefined) {
      updatePayload.min_stock = parseFloat(body.min_stock) || 5;
    }

    const { error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      console.error("Product update error:", error);
      return NextResponse.json(
        { success: false, message: error.message || "Failed to update product" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Server Error" },
      { status: error.status || 500 }
    );
  }
}
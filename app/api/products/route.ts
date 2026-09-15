import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { generateStoreBarcode } from "@/lib/barcode-engine";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { resolveProductCost } from "@/lib/product-costing";

export async function POST(req: Request) {
  try {
    // 0. Enforce Authentication & Role
    const session = await requireAuth();
    requireRole(session, ["owner", "manager", "inventory"]);

    const body = await req.json();
    const {
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

    // 1. Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Product name is required" },
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

    if (numericSellPrice < 0 || costResolution.landedCost < 0 || costResolution.purchaseCost < 0 || costResolution.additionalCost < 0) {
      return NextResponse.json(
        { success: false, message: "Prices and costs cannot be negative" },
        { status: 400 }
      );
    }

    if (numericStock < 0) {
      return NextResponse.json(
        { success: false, message: "Stock quantity cannot be negative" },
        { status: 400 }
      );
    }

    // 2. Barcode Handling & Collision Prevention
    let finalBarcode = (barcode || "").trim();
    if (finalBarcode) {
      // Check if barcode is already used by another product
      const { data: existingBarcode } = await supabase
        .from("products")
        .select("id, name")
        .eq("barcode", finalBarcode)
        .limit(1);

      if (existingBarcode && existingBarcode.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Barcode "${finalBarcode}" is already assigned to "${existingBarcode[0].name}".`,
          },
          { status: 409 }
        );
      }
    } else {
      // Auto-generate unique collision-safe barcode
      finalBarcode = generateStoreBarcode("AP");
    }

    // 3. Insert Product
    const newProduct = {
      name: name.trim(),
      barcode: finalBarcode,
      category: (category || "General").trim(),
      purchase_cost: costResolution.purchaseCost,
      additional_cost: costResolution.additionalCost,
      cost_breakdown: costResolution.costBreakdown,
      buy_price: costResolution.landedCost, // Authoritative Landed Cost
      sell_price: numericSellPrice,
      stock: numericStock,
      min_stock: parseFloat(body.min_stock) || 5,
    };

    const { data, error } = await supabase
      .from("products")
      .insert([newProduct])
      .select()
      .single();

    if (error) {
      console.error("Product insert error:", error);
      return NextResponse.json(
        { success: false, message: error.message || "Failed to create product" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product created successfully! 🚀",
      product: data,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    const status = error.status || 500;
    if (status >= 500) console.error("API /api/products exception:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An unexpected server error occurred." },
      { status }
    );
  }
}
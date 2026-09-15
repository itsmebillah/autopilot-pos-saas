import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      barcode,
      category = "General",
      buy_price = 0,
      sell_price = 0,
      stock = 0,
      sku,
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

    const numericBuyPrice = parseFloat(buy_price) || 0;
    const numericSellPrice = parseFloat(sell_price) || 0;
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
      buy_price: numericBuyPrice,
      sell_price: numericSellPrice,
      stock: numericStock,
    };

    if (sku !== undefined) {
      updatePayload.sku = sku ? sku.trim() : null;
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
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
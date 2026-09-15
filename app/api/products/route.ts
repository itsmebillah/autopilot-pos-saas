import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { generateStoreBarcode } from "@/lib/barcode-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      barcode,
      category = "General",
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

    const numericBuyPrice = parseFloat(buy_price) || 0;
    const numericSellPrice = parseFloat(sell_price) || 0;
    const numericStock = parseFloat(stock) || 0;

    if (numericSellPrice < 0 || numericBuyPrice < 0) {
      return NextResponse.json(
        { success: false, message: "Prices cannot be negative" },
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
      buy_price: numericBuyPrice,
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
    const error = err as Error;
    console.error("API /api/products exception:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireShopAuth, requireRole } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const session = await requireShopAuth();
    requireRole(session, ["owner", "manager", "inventory"]);

    const body = await req.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No products provided for import",
        },
        { status: 400 }
      );
    }

    const payload = products.map((p) => {
      const pCost = p.purchase_cost !== undefined ? parseFloat(p.purchase_cost) || 0 : undefined;
      const aCost = p.additional_cost !== undefined ? parseFloat(p.additional_cost) || 0 : undefined;
      const bPrice = parseFloat(p.buy_price) || 0;

      const finalPurchaseCost = pCost !== undefined ? pCost : bPrice;
      const finalAdditionalCost = aCost !== undefined ? aCost : 0;
      const finalBuyPrice = pCost !== undefined || aCost !== undefined ? finalPurchaseCost + finalAdditionalCost : bPrice;

      return {
        name: p.name,
        barcode: p.barcode,
        category: p.category || "General",
        purchase_cost: finalPurchaseCost,
        additional_cost: finalAdditionalCost,
        buy_price: finalBuyPrice,
        sell_price: parseFloat(p.sell_price) || 0,
        stock: parseFloat(p.stock) || 0,
        min_stock: parseFloat(p.min_stock) || 5,
      };
    });

    const { data, error } = await supabase.from("products").insert(payload).select();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      importedCount: data?.length || payload.length,
      data,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Bulk import failed",
      },
      { status: error.status || 500 }
    );
  }
}

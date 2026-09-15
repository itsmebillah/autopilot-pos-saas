import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
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

    const payload = products.map((p) => ({
      name: p.name,
      barcode: p.barcode,
      category: p.category || "General",
      buy_price: parseFloat(p.buy_price) || 0,
      sell_price: parseFloat(p.sell_price) || 0,
      stock: parseFloat(p.stock) || 0,
      min_stock: parseFloat(p.min_stock) || 5,
    }));

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

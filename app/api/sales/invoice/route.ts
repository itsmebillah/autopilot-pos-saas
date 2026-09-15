import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { buildInvoiceData } from "@/lib/invoice-engine";
import { requireShopAuth } from "@/lib/auth-guard";

export async function GET(req: Request) {
  try {
    await requireShopAuth();

    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get("id");
    const invoiceNo = searchParams.get("invoice_no");

    if (!saleId && !invoiceNo) {
      return NextResponse.json(
        { success: false, message: "Sale ID or Invoice Number is required" },
        { status: 400 }
      );
    }

    // 1. Fetch Sale Record
    let query = supabase.from("sales").select("*");
    if (saleId) {
      query = query.eq("id", saleId);
    } else if (invoiceNo) {
      query = query.eq("invoice_no", invoiceNo);
    }

    const { data: sale, error: saleError } = await query.single();
    if (saleError || !sale) {
      return NextResponse.json(
        { success: false, message: "Invoice record not found" },
        { status: 404 }
      );
    }

    // 2. Fetch Historical Sale Items (Guaranteed snapshot)
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale.id);

    // 3. Fetch Payments
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("sale_id", sale.id);

    // 4. Fetch Store Settings
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    // 5. Construct Canonical Invoice
    const invoice = buildInvoiceData(sale, saleItems || [], payments || [], settings || {});

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load invoice" },
      { status: error.status || 500 }
    );
  }
}

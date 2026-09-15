import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export async function GET() {
  try {
    await requireAuth();

    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
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
      settings: data || {
        store_name: "Autopilot POS Store",
        currency: "৳",
        currency_code: "BDT",
        currency_position: "BEFORE",
        tax_label: "VAT",
        tax_rate: 0,
        receipt_footer: "Thank you for shopping with us! Please come again.",
        return_policy: "Exchange available within 7 days with original invoice.",
        receipt_template: "thermal_80mm",
      },
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to load settings",
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    requireRole(session, ["owner", "manager"]);

    const body = await req.json();

    const {
      store_name,
      phone,
      email,
      website,
      address,
      currency,
      currency_code,
      currency_position,
      tax_number,
      tax_label,
      tax_rate,
      receipt_footer,
      return_policy,
      receipt_template,
      logo_url,
    } = body;

    const payload = {
      store_name,
      phone,
      email: email || null,
      website: website || null,
      address,
      currency: currency || "৳",
      currency_code: currency_code || "BDT",
      currency_position: currency_position || "BEFORE",
      tax_number: tax_number || null,
      tax_label: tax_label || "VAT",
      tax_rate: Number(tax_rate || 0),
      receipt_footer: receipt_footer || "Thank you for shopping with us!",
      return_policy: return_policy || "Exchange available within 7 days.",
      receipt_template: receipt_template || "thermal_80mm",
      logo_url: logo_url || null,
    };

    const { data: existing } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from("settings")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await supabase.from("settings").insert([payload]);
    }

    return NextResponse.json({
      success: true,
      message: "Store & Invoice settings updated successfully",
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Server Error",
      },
      { status: error.status || 500 }
    );
  }
}
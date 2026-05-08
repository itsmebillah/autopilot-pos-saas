import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const {
  id,
  name,
  barcode,
  category,
  buy_price,
  sell_price,
  stock,
} = body;

    const { error } = await supabase
      .from("products")
      .update({
        name,
        barcode,
        category,
        buy_price,
        sell_price,
        stock,
      })
      .eq("id", id);

    if (error) {

      return NextResponse.json({
        success: false,
        message: error.message,
      });

    }

    return NextResponse.json({
      success: true,
    });

  } catch {

    return NextResponse.json({
      success: false,
      message: "Server Error",
    });

  }
}
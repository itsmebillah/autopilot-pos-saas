import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const {
      name,
      barcode,
      buy_price,
      sell_price,
      stock,
    } = body;

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          barcode,
          buy_price,
          sell_price,
          stock,
        },
      ]);

    if (error) {
      return NextResponse.json({
        success: false,
        message: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {

    return NextResponse.json({
      success: false,
      message: "Server Error",
    });

  }
}
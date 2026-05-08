import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {

  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {

    return NextResponse.json({
      success: false,
      message: error.message,
    });

  }

  return NextResponse.json({
    success: true,
    settings: data,
  });
}

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const {
      store_name,
      phone,
      address,
      currency,
    } = body;

    const { data: existing } =
      await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .single();

    if (existing) {

      await supabase
        .from("settings")
        .update({
          store_name,
          phone,
          address,
          currency,
        })
        .eq("id", existing.id);

    } else {

      await supabase
        .from("settings")
        .insert([
          {
            store_name,
            phone,
            address,
            currency,
          },
        ]);

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
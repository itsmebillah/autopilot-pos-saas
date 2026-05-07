import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const { id } = body;

    const { error } = await supabase
      .from("products")
      .delete()
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
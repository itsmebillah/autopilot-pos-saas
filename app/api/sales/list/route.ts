import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {

    return NextResponse.json({
      success: false,
      message: error.message,
    });

  }

  return NextResponse.json({
    success: true,
    sales: data,
  });
}
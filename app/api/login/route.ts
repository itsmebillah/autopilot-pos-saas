import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email, password } = body;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .single();

    if (error || !data) {
      return NextResponse.json({
        success: false,
        message: "Invalid credentials",
      });
    }

    return NextResponse.json({
      success: true,
      user: data,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Server error",
    });
  }
}
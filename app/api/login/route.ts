import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Authenticate with Supabase Auth (cryptographic bcrypt/argon2 hashing, SSR cookie setting)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          success: false,
          message: error?.message || "Invalid email or password. Please try again.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
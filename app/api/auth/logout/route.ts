import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    const jar = await cookies();
    jar.delete("pos_shop_console_id");
    jar.delete("pos_active_store_id");

    return NextResponse.json({
      success: true,
      message: "Successfully signed out",
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Sign out error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await requireAuth();
    requireSuperAdmin(session);

    const adminClient = getServerSupabaseAdmin();
    const { data: categories, error } = await adminClient
      .from("shop_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      categories: categories || [],
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch shop categories" },
      { status: error.status || 500 }
    );
  }
}

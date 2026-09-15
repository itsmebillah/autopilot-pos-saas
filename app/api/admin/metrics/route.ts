import { NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await requireAuth();
    requireSuperAdmin(session);

    const adminClient = getServerSupabaseAdmin();

    const [
      { count: totalOrganizations },
      { count: totalStores },
      { count: activeStores },
      { count: suspendedStores },
      { count: totalUsers },
      { count: totalCategories },
    ] = await Promise.all([
      adminClient.from("organizations").select("*", { count: "exact", head: true }),
      adminClient.from("stores").select("*", { count: "exact", head: true }),
      adminClient.from("stores").select("*", { count: "exact", head: true }).eq("is_active", true),
      adminClient.from("stores").select("*", { count: "exact", head: true }).eq("is_active", false),
      adminClient.from("user_profiles").select("*", { count: "exact", head: true }),
      adminClient.from("shop_categories").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      success: true,
      metrics: {
        totalOrganizations: totalOrganizations || 0,
        totalStores: totalStores || 0,
        activeStores: activeStores || 0,
        suspendedStores: suspendedStores || 0,
        totalUsers: totalUsers || 0,
        totalCategories: totalCategories || 0,
      },
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch platform metrics" },
      { status: error.status || 500 }
    );
  }
}

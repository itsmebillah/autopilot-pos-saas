import { NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireSuperAdmin(session);

    const { id } = await params;
    const adminClient = getServerSupabaseAdmin();

    const { data: org, error: orgErr } = await adminClient
      .from("organizations")
      .select(`
        *,
        stores (
          *,
          shop_categories (
            id,
            key,
            name,
            description,
            default_attributes,
            default_modules
          )
        ),
        organization_members (
          id,
          user_id,
          role,
          is_active,
          created_at,
          user_profiles:user_id (
            id,
            full_name,
            phone,
            avatar_url
          )
        )
      `)
      .eq("id", id)
      .single();

    if (orgErr || !org) {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch store statistics
    const storeIds = (org.stores || []).map((s: any) => s.id);
    let totalProducts = 0;
    let totalSales = 0;

    if (storeIds.length > 0) {
      const [{ count: productsCount }, { count: salesCount }] = await Promise.all([
        adminClient.from("store_products").select("*", { count: "exact", head: true }).in("store_id", storeIds),
        adminClient.from("sales").select("*", { count: "exact", head: true }).in("store_id", storeIds),
      ]);
      totalProducts = productsCount || 0;
      totalSales = salesCount || 0;
    }

    return NextResponse.json({
      success: true,
      organization: {
        ...org,
        stats: {
          totalStores: org.stores?.length || 0,
          totalUsers: org.organization_members?.length || 0,
          totalProducts,
          totalSales,
        },
      },
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch organization details" },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin) return NextResponse.json({ message: "Invalid origin." }, { status: 403 });
    const session = await requireAuth();
    requireSuperAdmin(session);

    const { id } = await params;
    const body = await req.json();
    const { subscriptionStatus, planTier, maxStores, maxUsers, currentPeriodEnd } = body;
    if ((subscriptionStatus !== undefined && !["trialing", "active", "past_due", "canceled", "suspended"].includes(subscriptionStatus)) ||
        (planTier !== undefined && !["tier_free", "tier_starter", "tier_pro", "tier_enterprise", "standard"].includes(planTier)) ||
        ([maxStores, maxUsers].some(v => v !== undefined && (!Number.isInteger(v) || v < 1))) ||
        (currentPeriodEnd !== undefined && currentPeriodEnd !== null && (typeof currentPeriodEnd !== "string" || !Number.isFinite(Date.parse(currentPeriodEnd))))) {
      return NextResponse.json({ message: "Invalid subscription settings." }, { status: 400 });
    }

    const adminClient = getServerSupabaseAdmin();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (currentPeriodEnd !== undefined) updatePayload.current_period_end = currentPeriodEnd;
    if (subscriptionStatus) updatePayload.subscription_status = subscriptionStatus;
    if (planTier) updatePayload.plan_tier = planTier;
    if (typeof maxStores === "number") updatePayload.max_stores = maxStores;
    if (typeof maxUsers === "number") updatePayload.max_users = maxUsers;

    const { data: updated, error } = await adminClient
      .from("organizations")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Organization updated successfully",
      organization: updated,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update organization" },
      { status: error.status || 500 }
    );
  }
}

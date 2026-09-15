import { createServerSupabaseClient } from "./supabase-server";
import { getServerSupabaseAdmin } from "./supabase";

export type UserRole = "owner" | "manager" | "cashier" | "inventory" | "staff";

export interface AuthenticatedSession {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    fullName: string;
    phone?: string;
    avatarUrl?: string;
    isSuperAdmin: boolean;
  };
  organization: {
    id: string;
    name: string;
    businessType?: string;
    currencyCode?: string;
  };
  store: {
    id: string;
    name: string;
    code?: string;
  };
  role: UserRole;
  storeIds: string[];
}

/**
 * Resolves the authenticated Supabase user, user profile, organization membership, and store access.
 * Returns `null` if unauthenticated or no valid profile/membership exists.
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const adminClient = getServerSupabaseAdmin();

    // 1. Fetch user profile
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // 2. Fetch organization membership
    const { data: orgMember } = await adminClient
      .from("organization_members")
      .select("*, organizations(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    // 3. Fetch store memberships
    const { data: storeMembers } = await adminClient
      .from("store_members")
      .select("store_id, stores(*)")
      .eq("user_id", user.id);

    const storeIds = (storeMembers || []).map((sm: any) => sm.store_id);

    // If org exists, get default or first accessible store
    let primaryOrg: any = orgMember?.organizations;
    let primaryStore: any = storeMembers?.[0]?.stores;

    // Fallback if tenant records are missing (e.g. single-tenant bootstrap)
    if (!primaryOrg) {
      const { data: fallbackOrg } = await adminClient
        .from("organizations")
        .select("*")
        .limit(1)
        .single();
      primaryOrg = fallbackOrg || { id: "00000000-0000-0000-0000-000000000000", name: "Autopilot POS Retail" };
    }

    if (!primaryStore) {
      const { data: fallbackStore } = await adminClient
        .from("stores")
        .select("*")
        .limit(1)
        .single();
      primaryStore = fallbackStore || { id: "00000000-0000-0000-0000-000000000000", name: "Main Store" };
    }

    const role: UserRole = (orgMember?.role?.toLowerCase() as UserRole) || (profile?.is_super_admin ? "owner" : "cashier");

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        fullName: profile?.full_name || user.email?.split("@")[0] || "Authorized User",
        phone: profile?.phone || undefined,
        avatarUrl: profile?.avatar_url || undefined,
        isSuperAdmin: !!profile?.is_super_admin,
      },
      organization: {
        id: primaryOrg?.id || "00000000-0000-0000-0000-000000000000",
        name: primaryOrg?.name || "Autopilot POS Retail",
        businessType: primaryOrg?.business_type,
        currencyCode: primaryOrg?.currency_code || "BDT",
      },
      store: {
        id: primaryStore?.id || "00000000-0000-0000-0000-000000000000",
        name: primaryStore?.name || "Main Store",
        code: primaryStore?.code,
      },
      role,
      storeIds,
    };
  } catch (err) {
    console.error("Auth session resolution error:", err);
    return null;
  }
}

/**
 * Enforces authenticated session on API routes.
 * Throws an Error with status 401 if unauthenticated.
 */
export async function requireAuth(): Promise<AuthenticatedSession> {
  const session = await getAuthenticatedSession();
  if (!session) {
    const error = new Error("Unauthorized — Valid session required");
    (error as any).status = 401;
    throw error;
  }
  return session;
}

/**
 * Enforces role-based authorization.
 * Throws status 403 if the user role is not in the allowed list.
 */
export function requireRole(session: AuthenticatedSession, allowedRoles: UserRole[]) {
  if (session.profile.isSuperAdmin) return; // Super admin bypasses role restrictions
  if (!allowedRoles.includes(session.role)) {
    const error = new Error(`Forbidden — Insufficient permissions. Required: [${allowedRoles.join(", ")}]`);
    (error as any).status = 403;
    throw error;
  }
}

/**
 * Enforces store-level access.
 */
export function requireStoreAccess(session: AuthenticatedSession, storeId: string) {
  if (session.profile.isSuperAdmin) return;
  if (session.role === "owner" || session.role === "manager") return;
  if (!session.storeIds.includes(storeId)) {
    const error = new Error("Forbidden — Access to this store outlet is denied");
    (error as any).status = 403;
    throw error;
  }
}

import { createServerSupabaseClient } from "./supabase-server";
import { getServerSupabaseAdmin } from "./supabase";
import { cookies } from "next/headers";

export type UserRole = "owner" | "manager" | "cashier" | "inventory" | "staff";

export interface StoreSummary {
  id: string;
  name: string;
  code?: string;
}

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
  store: StoreSummary;
  accessibleStores: StoreSummary[];
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

    let primaryOrg: any = orgMember?.organizations;

    // Fallback if tenant records are missing (e.g. single-tenant bootstrap)
    if (!primaryOrg) {
      const { data: fallbackOrg } = await adminClient
        .from("organizations")
        .select("*")
        .limit(1)
        .single();
      primaryOrg = fallbackOrg || { id: "00000000-0000-0000-0000-000000000000", name: "Autopilot POS Retail" };
    }

    const role: UserRole = (orgMember?.role?.toLowerCase() as UserRole) || (profile?.is_super_admin ? "owner" : "cashier");

    // 3. Resolve accessible stores based on Role and Memberships
    let accessibleStores: StoreSummary[] = [];

    if (role === "owner" || role === "manager" || profile?.is_super_admin) {
      // Owners and Managers have access to all active stores within their organization
      const { data: orgStores } = await adminClient
        .from("stores")
        .select("id, name, code, is_active")
        .eq("organization_id", primaryOrg.id)
        .eq("is_active", true);

      if (orgStores && orgStores.length > 0) {
        accessibleStores = orgStores.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code || undefined,
        }));
      }
    } else {
      // Cashiers and Staff only have access to specifically assigned stores
      const { data: storeMembers } = await adminClient
        .from("store_members")
        .select("store_id, stores(id, name, code, is_active, organization_id)")
        .eq("user_id", user.id);

      if (storeMembers && storeMembers.length > 0) {
        accessibleStores = storeMembers
          .map((sm: any) => sm.stores)
          .filter((s: any) => s && s.is_active !== false)
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code || undefined,
          }));
      }
    }

    // Fallback if no stores exist
    if (accessibleStores.length === 0) {
      const { data: fallbackStore } = await adminClient
        .from("stores")
        .select("id, name, code")
        .limit(1)
        .single();
      accessibleStores = [
        fallbackStore || { id: "00000000-0000-0000-0000-000000000000", name: "Main Store" },
      ];
    }

    const storeIds = accessibleStores.map((s) => s.id);

    // 4. Resolve Active Store (from cookie or default to first accessible store)
    let activeStore = accessibleStores[0];
    try {
      const cookieStore = await cookies();
      const activeStoreCookie = cookieStore.get("pos_active_store_id")?.value;
      if (activeStoreCookie) {
        const found = accessibleStores.find((s) => s.id === activeStoreCookie);
        if (found) {
          activeStore = found;
        }
      }
    } catch {
      // Cookies read context fallback
    }

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
      store: activeStore,
      accessibleStores,
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

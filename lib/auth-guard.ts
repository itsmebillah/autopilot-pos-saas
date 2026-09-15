import { unstable_rethrow } from "next/navigation";
import { createServerSupabaseClient } from "./supabase-server";
import { getServerSupabaseAdmin } from "./supabase";
import { cookies } from "next/headers";

export type UserRole = "owner" | "manager" | "cashier" | "inventory" | "staff" | "platform_admin";

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
  shopConsole?: boolean;
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

    if (!profile) return null;
    const cookieStore = await cookies();
    const selected = cookieStore.get("pos_active_store_id")?.value;
    const consoleStoreId = cookieStore.get("pos_shop_console_id")?.value;
    let primaryOrg: any = null;
    let role: UserRole = "platform_admin";
    let accessibleStores: StoreSummary[] = [];
    let shopConsole = false;

    if (profile.is_super_admin) {
      // Platform mode has no implicit tenant. A server-validated explicit selection enters support mode.
      if (consoleStoreId) {
        const { data: target, error } = await adminClient.from("stores")
          .select("id, name, code, is_active, organizations(*)").eq("id", consoleStoreId).single();
        if (!error && target?.is_active && target.organizations) {
          primaryOrg = target.organizations;
          if (primaryOrg.subscription_status !== "suspended") {
            accessibleStores = [{ id: target.id, name: target.name, code: target.code }];
            shopConsole = true;
          }
        }
      }
    } else {
      const { data: memberships, error } = await adminClient.from("organization_members")
        .select("*, organizations(*)").eq("user_id", user.id).eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error || !memberships?.length) return null;
      let member = memberships[0];
      if (selected) {
        const { data: selectedStore } = await adminClient.from("stores")
          .select("organization_id").eq("id", selected).single();
        member = memberships.find(m => m.organization_id === selectedStore?.organization_id) || member;
      }
      primaryOrg = member.organizations;
      if (!primaryOrg || primaryOrg.subscription_status === "suspended") return null;
      role = member.role.toLowerCase() as UserRole;
      if (role === "owner" || role === "manager") {
        const { data, error } = await adminClient.from("stores")
          .select("id, name, code").eq("organization_id", primaryOrg.id).eq("is_active", true);
        if (error) return null;
        accessibleStores = data || [];
      } else {
        const { data, error } = await adminClient.from("store_members")
          .select("stores(id, name, code, is_active, organization_id)").eq("user_id", user.id);
        if (error) return null;
        accessibleStores = (data || []).map((m: any) => m.stores)
          .filter((s: any) => s?.is_active && s.organization_id === primaryOrg.id)
          .map((s: any) => ({ id: s.id, name: s.name, code: s.code }));
      }
      if (!accessibleStores.length) return null;
    }
    const storeIds = accessibleStores.map(s => s.id);
    const activeStore = accessibleStores.find(s => s.id === selected) || accessibleStores[0]
      || { id: "", name: "No shop selected" };

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
        id: primaryOrg?.id || "",
        name: primaryOrg?.name || "SaaS Platform",
        businessType: primaryOrg?.business_type,
        currencyCode: primaryOrg?.currency_code || "BDT",
      },
      store: activeStore,
      accessibleStores,
      role,
      storeIds,
      shopConsole,
    };
  } catch (err) {
    unstable_rethrow(err);
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
  if (session.profile.isSuperAdmin && !session.shopConsole) return;
  if (!session.storeIds.includes(storeId)) {
    const error = new Error("Forbidden — Access to this store outlet is denied");
    (error as any).status = 403;
    throw error;
  }
}

/**
 * Enforces platform super admin access.
 * Throws status 403 if the user is not a verified Platform Super Admin.
 */
export function requireSuperAdmin(session: AuthenticatedSession) {
  if (!session.profile.isSuperAdmin) {
    const error = new Error("Forbidden — Platform Super Admin privileges required");
    (error as any).status = 403;
    throw error;
  }
}

/** Retail APIs must never infer a tenant for a platform session. */
export async function requireShopAuth(): Promise<AuthenticatedSession> {
  const session = await requireAuth();
  if (session.profile.isSuperAdmin && !session.shopConsole) {
    throw Object.assign(new Error("Open a shop console before using shop operations."), { status: 403 });
  }
  return session;
}

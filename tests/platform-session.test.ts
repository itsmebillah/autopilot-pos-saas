import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  tables: {} as Record<string, any[]>, cookies: {} as Record<string, string>, authenticated: true,
}));
vi.mock("../lib/supabase-server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.authenticated ? { id: "user", email: "user@example.com" } : null }, error: null }) } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => state.cookies[name] ? { value: state.cookies[name] } : undefined }),
}));
vi.mock("../lib/supabase", () => ({
  getServerSupabaseAdmin: () => ({
    from: (table: string) => {
      let rows = state.tables[table] || [];
      const query: any = {
        select: () => query, order: () => query,
        eq: (key: string, value: unknown) => { rows = rows.filter(r => r[key] === value); return query; },
        single: async () => ({ data: rows[0] || null, error: null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return query;
    },
  }),
}));
import { getAuthenticatedSession, requireShopAuth, requireStoreAccess } from "../lib/auth-guard";

beforeEach(() => {
  state.authenticated = true;
  state.cookies = {};
  state.tables = {
    user_profiles: [{ id: "user", full_name: "User", is_super_admin: false }],
    organization_members: [{ user_id: "user", organization_id: "org-a", role: "owner", is_active: true, organizations: { id: "org-a", name: "A", subscription_status: "active" } }],
    stores: [{ id: "a", name: "A", organization_id: "org-a", is_active: true }, { id: "b", name: "B", organization_id: "org-b", is_active: true }],
  };
});
describe("Platform and shop session separation", () => {
  it("preserves an owner's verified shop and blocks foreign store access", async () => {
    state.cookies.pos_active_store_id = "b";
    const session = await getAuthenticatedSession();
    expect(session?.store.id).toBe("a");
    expect(() => requireStoreAccess(session!, "b")).toThrow();
  });
  it("does not fall back to another organization when membership is missing", async () => {
    state.tables.organization_members = [];
    expect(await getAuthenticatedSession()).toBeNull();
  });
  it("does not fall back to a foreign shop when all assigned shops are suspended", async () => {
    state.tables.stores[0].is_active = false;
    expect(await getAuthenticatedSession()).toBeNull();
  });
  it("rejects suspended organizations", async () => {
    state.tables.organization_members[0].organizations.subscription_status = "suspended";
    expect(await getAuthenticatedSession()).toBeNull();
  });
  it("platform owners have no implicit shop or shop-owner role", async () => {
    state.tables.user_profiles[0].is_super_admin = true;
    state.tables.organization_members = [];
    const session = await getAuthenticatedSession();
    expect(session?.role).toBe("platform_admin");
    expect(session?.storeIds).toEqual([]);
    expect(session?.shopConsole).toBe(false);
    await expect(requireShopAuth()).rejects.toMatchObject({ status: 403 });
  });
  it("validates explicit console selection and resolves the selected organization", async () => {
    state.tables.user_profiles[0].is_super_admin = true;
    state.tables.stores[1].organizations = { id: "org-b", name: "B", subscription_status: "active" };
    state.cookies.pos_shop_console_id = "b";
    const session = await requireShopAuth();
    expect(session.organization.id).toBe("org-b");
    expect(session.store.id).toBe("b");
    expect(session.shopConsole).toBe(true);
    expect(() => requireStoreAccess(session, "a")).toThrow();
  });
  it("ignores forged console cookies for a shop owner", async () => {
    state.cookies.pos_shop_console_id = "b";
    expect((await getAuthenticatedSession())?.store.id).toBe("a");
  });
  it("revalidates shop activation on every platform request", async () => {
    state.tables.user_profiles[0].is_super_admin = true;
    state.cookies.pos_shop_console_id = "b";
    state.tables.stores[1].is_active = false;
    await expect(requireShopAuth()).rejects.toMatchObject({ status: 403 });
  });
  it("rejects an unauthenticated request", async () => {
    state.authenticated = false;
    expect(await getAuthenticatedSession()).toBeNull();
  });
});

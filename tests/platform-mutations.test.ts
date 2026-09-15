import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ superAdmin: true, authenticated: true, from: vi.fn(), cookies: vi.fn() }));
vi.mock("@/lib/auth-guard", () => ({
  requireAuth: async () => {
    if (!mocks.authenticated) throw Object.assign(new Error("Unauthorized"), { status: 401 });
    return { profile: { isSuperAdmin: mocks.superAdmin } };
  },
  requireSuperAdmin: (session: { profile: { isSuperAdmin: boolean } }) => {
    if (!session.profile.isSuperAdmin) throw Object.assign(new Error("Forbidden"), { status: 403 });
  },
}));
vi.mock("@/lib/supabase", () => ({ getServerSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
import { POST as enter } from "../app/api/admin/console/route";
import { PATCH as subscription } from "../app/api/admin/organizations/[id]/route";
import { PATCH as category } from "../app/api/admin/categories/route";

function req(body: unknown, origin = "https://pos.example") {
  return new Request("https://pos.example/api/admin/console", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); mocks.superAdmin = true; mocks.authenticated = true; });
describe("Platform mutation boundaries", () => {
  it("rejects an unauthenticated console request", async () => {
    mocks.authenticated = false;
    expect((await enter(req({ storeId: "shop" }))).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("ignores a caller's claimed super-admin flag", async () => {
    mocks.superAdmin = false;
    expect((await enter(req({ storeId: "shop", isSuperAdmin: true }))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects foreign-origin console requests before any database access", async () => {
    expect((await enter(req({ storeId: "shop" }, "https://other.example"))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("does not create a console cookie for a missing shop", async () => {
    const chain = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: null, error: null }) };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); mocks.from.mockReturnValue(chain);
    expect((await enter(req({ storeId: "shop" }))).status).toBe(409);
    expect(mocks.cookies).not.toHaveBeenCalled();
  });
  it("rejects suspended shops", async () => {
    const chain = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: { id: "shop", is_active: false }, error: null }) };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); mocks.from.mockReturnValue(chain);
    expect((await enter(req({ storeId: "shop" }))).status).toBe(409);
    expect(mocks.cookies).not.toHaveBeenCalled();
  });
  it("blocks a shop owner from changing subscription state", async () => {
    mocks.superAdmin = false;
    expect((await subscription(req({ subscriptionStatus: "active" }), { params: Promise.resolve({ id: "org" }) })).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("validates subscription state before updating", async () => {
    expect((await subscription(req({ subscriptionStatus: "made-up" }), { params: Promise.resolve({ id: "org" }) })).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects an invalid renewal date", async () => {
    expect((await subscription(req({ currentPeriodEnd: "invalid" }), { params: Promise.resolve({ id: "org" }) })).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("blocks category mutations from a non-admin", async () => {
    mocks.superAdmin = false;
    expect((await category(req({ id: "c", name: "Category", modules: [] }))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects invalid module defaults", async () => {
    expect((await category(req({ id: "c", name: "Category", modules: ["unexpected"] }))).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

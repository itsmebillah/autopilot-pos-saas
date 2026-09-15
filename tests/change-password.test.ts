import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), updateUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: async () => ({ auth: mocks }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: mocks }),
}));
import { POST } from "../app/api/auth/change-password/route";

const currentPassword = randomBytes(20).toString("hex");
const newPassword = randomBytes(20).toString("hex");
function request(body: unknown, origin = "https://pos.example") {
  return new Request("https://pos.example/api/auth/change-password", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const valid = () => ({ currentPassword, newPassword, confirmPassword: newPassword });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "account", email: "test@example.com" } }, error: null });
  mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: "account" } }, error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});
describe("Authenticated password change", () => {
  it("changes the password after current-password verification", async () => {
    const res = await POST(request(valid()));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("rejects a wrong current password without updating", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { status: 400 } });
    expect((await POST(request(valid()))).status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("rejects mismatched confirmation before verifying credentials", async () => {
    expect((await POST(request({ ...valid(), confirmPassword: randomBytes(20).toString("hex") }))).status).toBe(400);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it("rejects short and whitespace passwords", async () => {
    for (const password of [randomBytes(2).toString("hex"), "        "]) {
      expect((await POST(request({ ...valid(), newPassword: password, confirmPassword: password }))).status).toBe(400);
    }
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("honors Supabase's stronger password policy", async () => {
    mocks.updateUser.mockResolvedValue({ error: { code: "weak_password" } });
    expect((await POST(request(valid()))).status).toBe(400);
  });
  it("requires authentication", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request(valid()))).status).toBe(401);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests", async () => {
    expect((await POST(request(valid(), "https://other.example"))).status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("rejects a verification identity mismatch", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
    expect((await POST(request(valid()))).status).toBe(403);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("handles null JSON safely", async () => {
    expect((await POST(request(null))).status).toBe(400);
  });
  it("does not reflect provider exception details", async () => {
    mocks.updateUser.mockRejectedValue(new Error("sensitive provider detail"));
    const res = await POST(request(valid()));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("sensitive provider detail");
    expect(mocks.signOut).toHaveBeenCalled();
  });
  it("returns rate limits without changing password", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { status: 429 } });
    expect((await POST(request(valid()))).status).toBe(429);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});

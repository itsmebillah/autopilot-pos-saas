import { describe, expect, it } from "vitest";
import { platformKpis, platformNavigation, subscriptionFlags, summarizePlatform } from "../lib/platform-model";

describe("Platform Control Center data semantics", () => {
  it("counts unique entities, including inactive records, without counting membership duplicates", () => {
    const m = summarizePlatform([{ id: "a" }, { id: "a" }, { id: "b" }], [
      { id: "s1", is_active: true }, { id: "s2", is_active: false },
    ], [{ id: "u1" }, { id: "u1" }], [{ id: "c1" }]);
    expect(m).toEqual({ totalOrganizations: 2, totalStores: 2, activeStores: 1, suspendedStores: 1, totalUsers: 1, totalCategories: 1 });
  });
  it("links every KPI to its corresponding list and shop status filters", () => {
    expect(platformKpis.map(k => k[2])).toEqual(["/admin/organizations", "/admin/shops", "/admin/shops?status=active", "/admin/shops?status=suspended", "/admin/users", "/admin/categories"]);
    expect(new Set(platformKpis.map(k => k[0])).size).toBe(6);
  });
  it("exposes only platform management in primary navigation", () => {
    expect(platformNavigation).toHaveLength(9);
    expect(platformNavigation.every(([url]) => url.startsWith("/admin"))).toBe(true);
  });
  it("does not infer paid status from an active subscription or invent renewal dates", () => {
    expect(subscriptionFlags({ subscription_status: "active", current_period_end: null }, 0)).toEqual({ trial: false, overdue: false, expiring: false });
  });
  it("uses recorded states and a seven-day renewal window", () => {
    const now = Date.parse("2026-09-15T00:00:00Z");
    expect(subscriptionFlags({ subscription_status: "past_due" }, now).overdue).toBe(true);
    expect(subscriptionFlags({ subscription_status: "trialing" }, now).trial).toBe(true);
    expect(subscriptionFlags({ current_period_end: "2026-09-22T00:00:00Z" }, now).expiring).toBe(true);
    expect(subscriptionFlags({ current_period_end: "2026-09-23T00:00:00Z" }, now).expiring).toBe(false);
    expect(subscriptionFlags({ current_period_end: "2026-09-14T00:00:00Z" }, now).expiring).toBe(false);
    expect(subscriptionFlags({ current_period_end: "invalid" }, now).expiring).toBe(false);
  });
});

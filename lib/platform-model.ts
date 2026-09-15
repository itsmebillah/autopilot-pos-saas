export function summarizePlatform(
  organizations: { id: string }[], stores: { id: string; is_active: boolean }[],
  profiles: { id: string }[], categories: { id: string }[],
) {
  return {
    totalOrganizations: new Set(organizations.map(o => o.id)).size,
    totalStores: new Set(stores.map(s => s.id)).size,
    activeStores: new Set(stores.filter(s => s.is_active === true).map(s => s.id)).size,
    suspendedStores: new Set(stores.filter(s => s.is_active === false).map(s => s.id)).size,
    totalUsers: new Set(profiles.map(u => u.id)).size,
    totalCategories: new Set(categories.map(c => c.id)).size,
  };
}

export function subscriptionFlags(org: { subscription_status?: string; current_period_end?: string | null }, now = Date.now()) {
  const end = org.current_period_end ? Date.parse(org.current_period_end) : NaN;
  return {
    trial: org.subscription_status === "trialing",
    overdue: org.subscription_status === "past_due",
    expiring: Number.isFinite(end) && end >= now && end <= now + 7 * 86400000,
  };
}

export const platformNavigation = [
  ["/admin", "Platform Overview"],
  ["/admin/organizations", "Organizations"],
  ["/admin/shops", "Shops"],
  ["/admin/owners", "Shop Owners"],
  ["/admin/users", "Users"],
  ["/admin/payments", "Payments & Subscriptions"],
  ["/admin/categories", "Categories"],
  ["/admin/settings", "Platform Settings"],
  ["/admin/support", "Support"],
] as const;

export const platformKpis = [
  ["totalOrganizations", "Total Organizations", "/admin/organizations"],
  ["totalStores", "Total Shops", "/admin/shops"],
  ["activeStores", "Active", "/admin/shops?status=active"],
  ["suspendedStores", "Suspended", "/admin/shops?status=suspended"],
  ["totalUsers", "Total Users", "/admin/users"],
  ["totalCategories", "Categories", "/admin/categories"],
] as const;

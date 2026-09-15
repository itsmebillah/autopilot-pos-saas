import { requireAuth, requireSuperAdmin } from "./auth-guard";
import { getServerSupabaseAdmin } from "./supabase";
import { summarizePlatform } from "./platform-model";

export async function loadPlatform() {
  const session = await requireAuth();
  requireSuperAdmin(session);
  const db = getServerSupabaseAdmin();
  async function rows(table: string) {
    const all: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await db.from(table).select("*").order("id").range(offset, offset + 499);
      if (result.error) throw new Error("Platform data could not be loaded.");
      all.push(...(result.data || []));
      if (!result.data || result.data.length < 500) return all;
    }
  }
  const [organizations, stores, profiles, members, assignments, categories] = await Promise.all(
    ["organizations", "stores", "user_profiles", "organization_members", "store_members", "shop_categories"].map(rows),
  );
  const authUsers: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw new Error("Auth directory could not be loaded.");
    authUsers.push(...data.users.map(u => ({ id: u.id, email: u.email })));
    if (data.users.length < 500) break;
  }
  const users = profiles.map(p => ({
    ...p, email: authUsers.find(u => u.id === p.id)?.email || null,
    memberships: members.filter(m => m.user_id === p.id),
  }));
  const shops = stores.map(s => {
    const organization = organizations.find(o => o.id === s.organization_id);
    const ownerIds = members.filter(m => m.organization_id === s.organization_id && m.role === "owner" && m.is_active).map(m => m.user_id);
    const owners = users.filter(u => ownerIds.includes(u.id) && !u.is_super_admin);
    const shopMembers = members.filter(m => m.organization_id === s.organization_id &&
      (["owner", "manager"].includes(m.role) || assignments.some(a => a.store_id === s.id && a.user_id === m.user_id)));
    return { ...s, organization, owners,
      category: categories.find(c => c.id === s.shop_category_id),
      users: users.filter(u => shopMembers.some(m => m.user_id === u.id)),
      outletsCount: stores.filter(outlet => outlet.organization_id === s.organization_id).length,
    };
  });
  return { organizations, shops, users, members, categories, authUsers, asOf: Date.now(),
    metrics: summarizePlatform(organizations, stores, profiles, categories),
  };
}

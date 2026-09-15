import Link from "next/link";
import { loadPlatform } from "@/lib/platform-data";
import { Heading, Fact } from "./PlatformUI";
export default async function PlatformUsers({ ownersOnly = false, shopId, organizationId }: { ownersOnly?: boolean; shopId?: string; organizationId?: string }) {
  const d = await loadPlatform();
  const shop = shopId ? d.shops.find(s => s.id === shopId) : null;
  const users = d.users.filter(u => (!ownersOnly || (!u.is_super_admin && u.memberships.some((m: any) => m.role === "owner" && m.is_active))) &&
    (!shopId || shop?.users.some((m: any) => m.id === u.id)) &&
    (!organizationId || u.memberships.some((m: any) => m.organization_id === organizationId)));
  return <><Heading title={ownersOnly ? "Shop Owners" : "Users"} detail={shop ? `Users with access or assignments to ${shop.name}. Manage staff inside the explicitly selected shop console.` : "Auth-linked profiles and their organization memberships."}/>
    <p className="text-sm">{users.length} profiles {shopId || organizationId ? "in this selection" : "across the platform"}</p>
    <div className="grid xl:grid-cols-2 gap-4">{users.map(u => <section key={u.id} className="panel space-y-4"><h2 className="font-bold">{u.full_name}</h2><dl className="grid grid-cols-2 gap-3"><Fact label="Email">{u.email}</Fact><Fact label="Platform role">{u.is_super_admin ? "Platform Owner" : "Tenant user"}</Fact></dl>
      {!u.memberships.length && <p className="text-sm text-slate-500">{u.is_super_admin ? "Platform access is independent of shop membership." : "No organization membership."}</p>}
      {u.memberships.map((m: any) => <div key={m.id} className="border-t border-slate-200 dark:border-slate-700 pt-3 text-sm"><p>{d.organizations.find(o => o.id === m.organization_id)?.name || "Missing organization" } / {m.role} / {m.is_active ? "Active" : "Inactive"}</p><Link className="action mt-2" href={`/admin/shops?organization=${m.organization_id}`}>Choose shop to manage users</Link></div>)}
    </section>)}</div>{!users.length && <div className="panel">No matching profiles.</div>}
  </>;
}

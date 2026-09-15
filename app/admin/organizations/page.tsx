import Link from "next/link";
import { loadPlatform } from "@/lib/platform-data";
import { Heading, Fact, date } from "@/components/PlatformUI";
export default async function Organizations() {
  const d = await loadPlatform();
  return <><div className="flex flex-wrap justify-between gap-3"><Heading title="Organizations" detail="All tenant businesses, including records without outlets."/><Link href="/admin/organizations/new" className="action primary">Create business & first shop</Link></div>
    <div className="grid xl:grid-cols-2 gap-4">{d.organizations.map(o => <article key={o.id} className="panel space-y-4"><h2 className="font-bold text-lg">{o.name}</h2>
      {d.organizations.filter(other => other.name.toLowerCase() === o.name.toLowerCase()).length > 1 && <p className="text-sm text-amber-700 dark:text-amber-300">Duplicate name - distinct business IDs; review before merging.</p>}
      <dl className="grid grid-cols-2 gap-4"><Fact label="Shops">{d.shops.filter(s => s.organization_id === o.id).length}</Fact><Fact label="Members">{d.members.filter(m => m.organization_id === o.id).length}</Fact><Fact label="Plan">{o.plan_tier}</Fact><Fact label="Created">{date(o.created_at)}</Fact></dl>
      <div className="flex flex-wrap gap-2"><Link className="action" href={`/admin/organizations/${o.id}`}>Manage business / Add Outlet</Link><Link className="action" href={`/admin/shops?organization=${o.id}`}>View shops</Link><Link className="action" href={`/admin/payments?organization=${o.id}`}>Subscription</Link></div>
    </article>)}</div>{!d.organizations.length && <p>No organizations have been created.</p>}</>;
}

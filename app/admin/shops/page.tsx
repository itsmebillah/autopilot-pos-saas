import Link from "next/link";
import { loadPlatform } from "@/lib/platform-data";
import { Heading, ShopCard } from "@/components/PlatformUI";
export default async function Shops({ searchParams }: { searchParams: Promise<{ status?: string; query?: string; organization?: string }> }) {
  const p = await searchParams;
  const d = await loadPlatform();
  const shops = d.shops.filter(s => (!p.organization || s.organization_id === p.organization) &&
    (p.status !== "active" || s.is_active) && (p.status !== "suspended" || !s.is_active) &&
    (!p.query || [s.name, s.organization?.name, ...s.owners.map((u: any) => u.full_name)].join(" ").toLowerCase().includes(p.query.toLowerCase())));
  return <><Heading title="Shops" detail="Every outlet has its own management page and explicit shop console."/>
    <form className="panel grid sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
      {p.organization && <input type="hidden" name="organization" value={p.organization}/>}
      <label>Find a shop, business or owner<input name="query" defaultValue={p.query} placeholder="Search shops"/></label>
      <label>Status<select name="status" defaultValue={p.status || "all"}><option value="all">All</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
      <button className="action primary">Apply filters</button>
    </form>
    <div className="flex flex-wrap justify-between gap-3 text-sm"><p>{shops.length} shops / {p.status || "all"}</p><Link href="/admin/shops" className="text-indigo-600">Clear filters</Link></div>
    <div className="space-y-4">{shops.map(s => <ShopCard key={s.id} shop={s}/>)}</div>{!shops.length && <div className="panel">No shops match these filters.</div>}
  </>;
}

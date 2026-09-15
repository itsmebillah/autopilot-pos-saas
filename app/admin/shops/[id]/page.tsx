import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPlatform } from "@/lib/platform-data";
import { Heading, ShopCard, Fact } from "@/components/PlatformUI";
export default async function ShopDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadPlatform();
  const s = d.shops.find(s => s.id === id);
  if (!s) notFound();
  return <><Link href="/admin/shops" className="text-sm text-indigo-600">Back to all shops</Link><Heading title={s.name} detail="Shop management & support"/><ShopCard shop={s}/>
    <section className="panel space-y-4"><h2 className="font-bold">Business & access</h2><dl className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <Fact label="Organization">{s.organization?.name}</Fact><Fact label="Owner email">{s.owners.map((u: any) => u.email || "Not recorded").join(", ") || "Unassigned"}</Fact><Fact label="Shop email">{s.email}</Fact><Fact label="Users count">{s.users.length}</Fact><Fact label="Outlets in business">{s.outletsCount}</Fact><Fact label="Modules">{(s.enabled_modules || []).join(", ")}</Fact>
    </dl><p className="text-xs text-slate-500">Users include assigned staff and organization owners/managers, including inactive memberships for review.</p><Link className="action" href={`/admin/organizations/${s.organization_id}`}>Add Outlet / Manage business</Link></section>
  </>;
}

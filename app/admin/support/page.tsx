import Link from "next/link";
import { Heading } from "@/components/PlatformUI";
import { loadPlatform } from "@/lib/platform-data";
export default async function Support() {
  const d = await loadPlatform();
  return <><Heading title="Support" detail="Find a client's business and explicitly open its shop console to assist them."/><section className="panel space-y-3"><h2 className="font-bold">Shop assistance</h2><p className="text-sm text-slate-500">Shop console actions run as Platform Admin in the selected shop. Return to Platform when finished. A ticketing system is not connected.</p><Link className="action primary" href="/admin/shops">Find a shop</Link></section>
    <div className="grid xl:grid-cols-2 gap-4">{d.shops.map(s => <section className="panel space-y-3" key={s.id}><h2 className="font-bold">{s.name}</h2><p className="text-sm">{s.owners.map((u: any) => u.email).filter(Boolean).join(", ") || "No owner email recorded"}</p><Link className="action" href={`/admin/shops/${s.id}`}>View shop & support actions</Link></section>)}</div>
  </>;
}

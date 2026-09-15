import Link from "next/link";
import { loadPlatform } from "@/lib/platform-data";
import { platformKpis } from "@/lib/platform-model";
import { Heading, PaymentAttention } from "@/components/PlatformUI";
export default async function Overview() {
  const data = await loadPlatform();
  return <>
    <div className="flex flex-wrap items-start justify-between gap-4"><Heading title="Platform Overview" detail="Manage businesses, client access and subscription follow-up from one place."/><Link className="action primary" href="/admin/organizations/new">Onboard a business</Link></div>
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
      {platformKpis.map(([key, label, href]) => <Link key={key} href={href} className="panel hover:ring-2 hover:ring-indigo-400 transition-shadow"><span className="text-xs sm:text-sm text-slate-500">{label}</span><strong className="block text-3xl sm:text-4xl my-2">{data.metrics[key]}</strong><span className="text-xs text-indigo-600 dark:text-indigo-400">View records</span></Link>)}
    </div>
    <PaymentAttention shops={data.shops} asOf={data.asOf}/>
    <div className="grid md:grid-cols-2 gap-4"><section className="panel space-y-3"><h2 className="font-bold">Platform health</h2><p className="text-sm">Database and Auth directory responded to this request.</p><p className="text-sm text-slate-500">No uptime or incident telemetry is connected.</p><Link className="action" href="/admin/settings">View configuration</Link></section><section className="panel space-y-3"><h2 className="font-bold">Count definitions & data review</h2><p className="text-sm text-slate-500">Counts include inactive and legacy records by unique ID. A shop is an outlet. Users are Auth-linked profiles, not memberships.</p><Link className="action" href="/admin/organizations">Review organizations</Link></section></div>
  </>;
}

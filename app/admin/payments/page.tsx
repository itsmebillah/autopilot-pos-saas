import Link from "next/link";
import { loadPlatform } from "@/lib/platform-data";
import { subscriptionFlags } from "@/lib/platform-model";
import { Heading, BillingGap, PaymentAttention, Fact, date } from "@/components/PlatformUI";
import SubscriptionEditor from "@/components/SubscriptionEditor";
export default async function Payments({ searchParams }: { searchParams: Promise<{ status?: string; organization?: string }> }) {
  const p = await searchParams, d = await loadPlatform();
  const now = d.asOf;
  const counts = {
    trial: d.organizations.filter(o => subscriptionFlags(o, now).trial).length,
    overdue: d.organizations.filter(o => subscriptionFlags(o, now).overdue).length,
    expiring: d.organizations.filter(o => subscriptionFlags(o, now).expiring).length,
  };
  const orgs = d.organizations.filter(o => (!p.organization || o.id === p.organization) &&
    (!p.status || p.status === "all" || (p.status === "trial" && subscriptionFlags(o, now).trial) ||
      (p.status === "overdue" && subscriptionFlags(o, now).overdue) || (p.status === "expiring" && subscriptionFlags(o, now).expiring)));
  return <><Heading title="Payments & Subscriptions" detail="Subscriptions belong to businesses and cover their outlets. Counts below are businesses, not shops."/>
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
      {(["Paid", "Due"] as const).map(label => <Link className="panel" key={label} href={`/admin/payments?status=${label.toLowerCase()}#billing-gap`}><span className="text-sm">{label}</span><strong className="block text-lg mt-2">Unavailable</strong></Link>)}
      {(["overdue", "trial", "expiring"] as const).map(key => <Link key={key} className="panel" href={`/admin/payments?status=${key}`}><span className="text-sm">{key === "expiring" ? "Expiring Soon" : key === "overdue" ? "Overdue (recorded)" : "Trial"}</span><strong className="block text-3xl mt-2">{counts[key]}</strong></Link>)}
    </div>
    <BillingGap/><PaymentAttention shops={d.shops} asOf={d.asOf}/>
    <div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">Subscriptions / {p.status || "all"}</h2><Link className="text-sm text-indigo-600" href="/admin/payments">Clear filters</Link></div>
    {!orgs.length && <div className="panel">{p.status === "paid" || p.status === "due" ? "This filter requires invoice and payment records, which are not available." : "No subscriptions match these filters."}</div>}
    {orgs.map(o => <section className="panel space-y-4" key={o.id}><h3 className="font-bold text-lg">{o.name}</h3><dl className="grid grid-cols-2 gap-3"><Fact label="Current period end">{date(o.current_period_end)}</Fact><Fact label="Payment status">Unavailable</Fact></dl>
      <SubscriptionEditor organization={o}/><Link className="action" href={`/admin/shops?organization=${o.id}`}>View shops</Link>
    </section>)}
  </>;
}

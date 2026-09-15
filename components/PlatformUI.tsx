import Link from "next/link";
import { subscriptionFlags } from "@/lib/platform-model";
import ShopActions from "./ShopActions";

export function Heading({ title, detail }: { title: string; detail?: string }) {
  return <div><p className="text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold mb-2">Platform management</p><h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>{detail && <p className="text-sm text-slate-500 mt-2">{detail}</p>}</div>;
}
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500 mb-1">{label}</dt><dd className="text-sm font-semibold">{children ?? "Not recorded"}</dd></div>;
}
export function date(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { timeZone: "UTC" }) : "Not recorded";
}
export function ShopCard({ shop }: { shop: any }) {
  return <article className="panel space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><div><Link className="text-lg font-bold text-indigo-600 dark:text-indigo-400 hover:underline" href={`/admin/shops/${shop.id}`}>{shop.name}</Link><p className="text-sm text-slate-500">{shop.organization?.name || "Organization missing"}</p></div><span className={`text-xs font-bold rounded-full self-start px-3 py-1 ${shop.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{shop.is_active ? "Active" : "Suspended"}</span></div>
    <dl className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <Fact label="Owner">{shop.owners.map((u: any) => u.full_name).join(", ") || "Unassigned"}</Fact>
      <Fact label="Category">{shop.category?.name}</Fact>
      <Fact label="Plan">{shop.organization?.plan_tier}</Fact>
      <Fact label="Payment status">Unavailable</Fact>
      <Fact label="Created">{date(shop.created_at)}</Fact>
      <Fact label="Subscription">{shop.organization?.subscription_status}</Fact>
    </dl>
    <ShopActions shopId={shop.id} organizationId={shop.organization_id} active={shop.is_active}/>
  </article>;
}
export function BillingGap() {
  return <div id="billing-gap" className="panel border-amber-300 space-y-2">
    <h2 className="font-bold">Payment records are not configured</h2>
    <p className="text-sm text-slate-500">Subscription plans, states and period-end dates are available. SaaS invoices, amounts due, due dates and payment receipts are missing. Paid and Due totals cannot be calculated. POS sale payments are excluded.</p>
    <p className="text-sm">Record Payment is unavailable until a subscription invoice and payment ledger is implemented.</p>
  </div>;
}
export function PaymentAttention({ shops, asOf }: { shops: any[]; asOf: number }) {
  const attention = shops.filter(s => { const f = subscriptionFlags(s.organization || {}, asOf); return f.overdue || f.expiring; });
  return <section className="panel space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">Payment Attention Required</h2><Link href="/admin/payments" className="text-sm text-indigo-600">View subscriptions</Link></div>
    <p className="text-sm text-slate-500">Based on recorded past-due subscription status or a period ending within seven days. Amount and invoice due date are unavailable.</p>
    {!attention.length ? <p className="text-sm">No subscriptions are flagged by the available records. This does not confirm that payments are up to date.</p> : attention.map(shop => <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3" key={shop.id}>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3"><Fact label="Shop">{shop.name}</Fact><Fact label="Owner">{shop.owners.map((u: any) => u.full_name).join(", ") || "Unassigned"}</Fact><Fact label="Plan">{shop.organization.plan_tier}</Fact><Fact label="Amount due">Unavailable</Fact><Fact label="Due date">Unavailable</Fact><Fact label="Status">{shop.organization.subscription_status}</Fact></dl>
      <div className="flex flex-wrap gap-2"><Link className="action" href={`/admin/shops/${shop.id}`}>View Shop</Link><Link className="action" href={`/admin/payments?organization=${shop.organization_id}`}>View Subscription</Link><Link className="action" href="/admin/payments#billing-gap">Record Payment - unavailable</Link></div>
    </div>)}
  </section>;
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { loadPlatform } from "@/lib/platform-data";
import { Heading, Fact, date, ShopCard } from "@/components/PlatformUI";
import OnboardingForm from "@/components/OnboardingForm";
export default async function Organization({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, d = await loadPlatform();
  const o = d.organizations.find(o => o.id === id);
  if (!o) notFound();
  const shops = d.shops.filter(s => s.organization_id === id);
  return <><Heading title={o.name} detail="Organization details and its outlets"/>
    <section className="panel space-y-4"><dl className="grid grid-cols-2 gap-3"><Fact label="Plan">{o.plan_tier}</Fact><Fact label="Subscription">{o.subscription_status}</Fact><Fact label="Created">{date(o.created_at)}</Fact><Fact label="Outlets">{shops.length}</Fact></dl>
    <div className="flex flex-wrap gap-2"><Link className="action" href={`/admin/users?organization=${id}`}>Manage Users</Link><Link className="action" href={`/admin/payments?organization=${id}`}>Manage Subscription</Link></div></section>
    {shops.map(s => <ShopCard key={s.id} shop={s}/>)}
    <OnboardingForm categories={d.categories} organizationId={id}/>
  </>;
}

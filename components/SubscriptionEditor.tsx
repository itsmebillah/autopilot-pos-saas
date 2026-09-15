"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function SubscriptionEditor({ organization }: { organization: { id: string; plan_tier: string; subscription_status: string; current_period_end?: string | null } }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/admin/organizations/${organization.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        planTier: form.get("plan"), subscriptionStatus: form.get("status"),
        currentPeriodEnd: form.get("end") ? new Date(String(form.get("end")) + "T23:59:59Z").toISOString() : null,
      }) });
      if (!res.ok) throw new Error("Subscription could not be updated.");
      setMessage("Subscription metadata saved. No payment was recorded."); router.refresh();
    } catch { setMessage("Unable to save subscription. Please retry."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-3">
    <div className="grid sm:grid-cols-3 gap-3"><label>Plan<select name="plan" defaultValue={organization.plan_tier}>{Array.from(new Set([organization.plan_tier, "tier_free", "tier_starter", "tier_pro", "tier_enterprise"])).map(p => <option key={p}>{p}</option>)}</select></label>
    <label>Subscription state<select name="status" defaultValue={organization.subscription_status}>{["trialing", "active", "past_due", "canceled", "suspended"].map(s => <option key={s}>{s}</option>)}</select></label>
    <label>Period end (UTC)<input name="end" type="date" defaultValue={organization.current_period_end?.slice(0, 10) || ""}/></label></div>
    <p className="text-xs text-slate-500">Subscription state applies to every outlet in this business. Suspended businesses cannot enter their shop consoles.</p>
    <button disabled={busy} className="action primary">{busy ? "Saving..." : "Save subscription"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}

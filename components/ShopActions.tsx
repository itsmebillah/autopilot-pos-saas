"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ShopActions({ shopId, organizationId, active }: { shopId: string; organizationId: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  async function act(consoleMode: boolean) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(consoleMode ? "/api/admin/console" : `/api/admin/stores/${shopId}/status`, {
        method: consoleMode ? "POST" : "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consoleMode ? { storeId: shopId } : { isActive: !active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Action failed.");
      if (consoleMode) window.location.assign("/dashboard");
      else { setMessage("Shop status updated."); setConfirm(false); router.refresh(); }
    } catch (e) { setMessage(e instanceof Error ? e.message : "Action failed. Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <button disabled={busy || !active} className="action primary" onClick={() => act(true)}>Open Shop Console</button>
      <Link className="action" href={`/admin/shops/${shopId}`}>Manage Shop</Link>
      <Link className="action" href={`/admin/users?shop=${shopId}`}>Manage Users</Link>
      <Link className="action" href={`/admin/payments?organization=${organizationId}`}>Manage Subscription</Link>
      <button className="action" disabled={busy} onClick={() => setConfirm(!confirm)}>{active ? "Suspend" : "Activate"}</button>
    </div>
    {confirm && <div className="rounded-xl border border-amber-400 p-3 text-sm space-y-2"><p>{active ? "Suspend this shop? Staff will lose access to its console." : "Activate this shop?"}</p><button className="action" disabled={busy} onClick={() => act(false)}>Confirm {active ? "suspension" : "activation"}</button> <button className="action" onClick={() => setConfirm(false)}>Cancel</button></div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}

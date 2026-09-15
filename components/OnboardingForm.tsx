"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function OnboardingForm({ categories, organizationId }: { categories: { id: string; name: string }[]; organizationId?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const response = await fetch(organizationId ? "/api/admin/stores/create" : "/api/admin/organizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(organizationId ? { ...body, organizationId } : body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Creation failed.");
      router.push(`/admin/shops/${data.storeId || data.store?.id}`); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to create. Please retry."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="panel space-y-4">
    <h2 className="font-bold text-lg">{organizationId ? "Add Outlet" : "Business & first shop"}</h2>
    <div className="grid sm:grid-cols-2 gap-4">
      {!organizationId && <label>Business name<input name="businessName" required maxLength={255}/></label>}
      <label>Shop name<input name={organizationId ? "name" : "storeName"} required maxLength={255}/></label>
      <label>Shop code (optional)<input name={organizationId ? "code" : "storeCode"} maxLength={50}/></label>
      <label>Category<select name="shopCategoryId" required defaultValue=""><option value="" disabled>Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Shop email<input name="email" type="email"/></label><label>Shop phone<input name="phone" type="tel"/></label>
      <label>Address<input name="address"/></label>
      {!organizationId && <><label>Owner full name<input name="adminFullName" required maxLength={255}/></label><label>Owner Auth email<input name="adminEmail" type="email" required/></label><label>Owner phone<input name="adminPhone" type="tel"/></label></>}
    </div>
    {!organizationId && <p className="text-sm text-slate-500">Existing Auth accounts retain their identity. New accounts need a separate sign-in setup. This form does not send an invitation or set a password. Platform owners cannot be assigned as shop owners.</p>}
    {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
    <button disabled={busy || !categories.length} className="action primary">{busy ? "Creating..." : organizationId ? "Create outlet" : "Create business & shop"}</button>
  </form>;
}

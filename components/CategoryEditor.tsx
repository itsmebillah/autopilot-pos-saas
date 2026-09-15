"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CategoryEditor({ category }: { category: { id: string; name: string; default_modules: string[] } }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true);
    try {
      const response = await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id, name: form.get("name"), modules: String(form.get("modules")).split(",").map(s => s.trim()).filter(Boolean) }) });
      if (!response.ok) throw new Error();
      setMessage("Category defaults saved for future shops."); router.refresh();
    } catch { setMessage("Unable to save. Module names must start with mod_ and contain only lowercase letters, digits or underscores."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-3"><label>Category name<input required maxLength={100} name="name" defaultValue={category.name}/></label><label>Default modules (comma separated)<input name="modules" defaultValue={category.default_modules.join(", ")}/></label><button className="action" disabled={busy}>Save category defaults</button>{message && <p role="status" className="text-sm">{message}</p>}</form>;
}

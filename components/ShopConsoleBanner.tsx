"use client";
import { useState } from "react";
export default function ShopConsoleBanner({ name }: { name: string }) {
  const [error, setError] = useState("");
  async function exit() {
    const result = await fetch("/api/admin/console", { method: "DELETE" }).catch(() => null);
    if (result?.ok) window.location.assign("/admin");
    else setError("Unable to exit. Please retry.");
  }
  return <div className="bg-indigo-700 text-white p-3 text-sm flex flex-wrap gap-3 justify-between">
    <span>Shop support console: <strong>{name}</strong> / Platform Admin</span>
    <button onClick={exit} className="underline font-bold">Return to Platform</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}

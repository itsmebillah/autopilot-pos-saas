"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function SettingsPage() {

    const [logo, setLogo] =
  useState<File | null>(null);
  const [storeName, setStoreName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [currency, setCurrency] =
    useState("৳");

  async function loadSettings() {

    const res = await fetch("/api/settings");

    const data = await res.json();

    if (data.success && data.settings) {

      setStoreName(
        data.settings.store_name || ""
      );

      setPhone(
        data.settings.phone || ""
      );

      setAddress(
        data.settings.address || ""
      );

      setCurrency(
        data.settings.currency || "৳"
      );

    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function saveSettings(
    
    e: React.FormEvent
  ) {
console.log("SAVE CLICKED");
    e.preventDefault();
let logoUrl = "";

if (logo) {

  const formData =
    new FormData();

  formData.append(
    "file",
    logo
  );

  const uploadRes =
    await fetch(
      "/api/upload-logo",
      {
        method: "POST",
        body: formData,
      }
    );

  const uploadData =
    await uploadRes.json();

  if (uploadData.success) {
    console.log(uploadData);
console.log(uploadData);
    logoUrl =
      uploadData.url;

  }

}
    const res = await fetch(
      "/api/settings",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          store_name: storeName,
          phone,
          address,
          currency,
          logo_url: logoUrl,
        }),
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("Settings Saved 🚀");
    }

  }

  return (
    <main className="min-h-screen bg-black text-white flex">

      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-4xl font-bold mb-8">
          Store Settings
        </h1>

        <form
          onSubmit={saveSettings}
          className="max-w-2xl bg-white/10 p-8 rounded-3xl space-y-5"
        >

          <input
            type="text"
            placeholder="Store Name"
            value={storeName}
            onChange={(e) =>
              setStoreName(e.target.value)
            }
            className="w-full p-4 rounded-xl bg-black/30"
          />

          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            className="w-full p-4 rounded-xl bg-black/30"
          />

          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) =>
              setAddress(e.target.value)
            }
            className="w-full p-4 rounded-xl bg-black/30"
          />
<input
  type="file"
  accept="image/*"
  onChange={(e) => {

    if (e.target.files?.[0]) {

      setLogo(
        e.target.files[0]
      );

    }

  }}
  className="w-full p-4 rounded-xl bg-black/30"
/>
          <input
            type="text"
            placeholder="Currency"
            value={currency}
            onChange={(e) =>
              setCurrency(e.target.value)
            }
            className="w-full p-4 rounded-xl bg-black/30"
          />

          <button
            type="submit"
            className="bg-green-500 px-6 py-3 rounded-2xl"
          >
            Save Settings
          </button>

        </form>

      </div>

    </main>
  );
}
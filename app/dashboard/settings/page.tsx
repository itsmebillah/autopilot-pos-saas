"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Store, Upload, Save } from "lucide-react";

export default function SettingsPage() {
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("৳");
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();

      if (data.success && data.settings) {
        setStoreName(data.settings.store_name || "");
        setPhone(data.settings.phone || "");
        setAddress(data.settings.address || "");
        setCurrency(data.settings.currency || "৳");
        setExistingLogoUrl(data.settings.logo_url || "");
        setLogoPreview(data.settings.logo_url || "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      let finalLogoUrl = existingLogoUrl;

      if (logo) {
        const formData = new FormData();
        formData.append("file", logo);

        const uploadRes = await fetch("/api/upload-logo", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          finalLogoUrl = uploadData.url;
        }
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName,
          phone,
          address,
          currency,
          logo_url: finalLogoUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Store settings saved successfully! 🚀");
        setExistingLogoUrl(finalLogoUrl);
      } else {
        alert(data.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Settings save error:", err);
      alert("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Bar */}
        <div className="mb-6 sm:mb-8 pb-4 border-b border-white/10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Store Settings</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Configure outlet branding, receipts, contact info, and local currency
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={saveSettings} className="bg-white/5 border border-white/10 p-5 sm:p-8 rounded-2xl sm:rounded-3xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Store className="text-green-500 w-6 h-6" />
            <h2 className="text-lg font-bold text-white">Store Identity & Branding</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Store Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
                Store Name
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Luxury Timepieces"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
                Contact Phone
              </label>
              <input
                type="text"
                placeholder="e.g. +880 1700-000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Currency Symbol */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
                Currency Symbol
              </label>
              <input
                type="text"
                placeholder="৳, $, €, £, AED"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
                Physical Address
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Plot 12, Road 45, Gulshan 2, Dhaka - 1212"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500 resize-none"
              />
            </div>

            {/* Logo Upload */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5">
                Store Logo Image
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {logoPreview && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/50 border border-white/10 shrink-0">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                )}

                <label className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl bg-black/40 border border-dashed border-white/20 hover:border-green-500/50 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-300 font-medium">Click to choose image file</span>
                  <span className="text-[10px] text-gray-500">PNG, JPG or WebP (max 2MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        setLogo(file);
                        setLogoPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95"
            >
              <Save size={18} />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
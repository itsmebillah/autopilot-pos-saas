"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Store, Upload, Save, Receipt, Globe } from "lucide-react";

export default function SettingsPage() {
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("৳");
  const [currencyCode, setCurrencyCode] = useState("BDT");
  const [currencyPosition, setCurrencyPosition] = useState<"BEFORE" | "AFTER">("BEFORE");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxLabel, setTaxLabel] = useState("VAT");
  const [taxRate, setTaxRate] = useState("0");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for shopping with us! Please come again.");
  const [returnPolicy, setReturnPolicy] = useState("Exchange available within 7 days with original invoice.");
  const [receiptTemplate, setReceiptTemplate] = useState<"thermal_80mm" | "thermal_58mm" | "a4_standard">("thermal_80mm");
  const [existingLogoUrl, setExistingLogoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();

      if (data.success && data.settings) {
        setStoreName(data.settings.store_name || "");
        setPhone(data.settings.phone || "");
        setEmail(data.settings.email || "");
        setWebsite(data.settings.website || "");
        setAddress(data.settings.address || "");
        setCurrency(data.settings.currency || "৳");
        setCurrencyCode(data.settings.currency_code || "BDT");
        setCurrencyPosition(data.settings.currency_position || "BEFORE");
        setTaxNumber(data.settings.tax_number || "");
        setTaxLabel(data.settings.tax_label || "VAT");
        setTaxRate(String(data.settings.tax_rate ?? 0));
        setReceiptFooter(data.settings.receipt_footer || "Thank you for shopping with us! Please come again.");
        setReturnPolicy(data.settings.return_policy || "Exchange available within 7 days with original invoice.");
        setReceiptTemplate(data.settings.receipt_template || "thermal_80mm");
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
          email,
          website,
          address,
          currency,
          currency_code: currencyCode,
          currency_position: currencyPosition,
          tax_number: taxNumber,
          tax_label: taxLabel,
          tax_rate: parseFloat(taxRate) || 0,
          receipt_footer: receiptFooter,
          return_policy: returnPolicy,
          receipt_template: receiptTemplate,
          logo_url: finalLogoUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Store and invoice preferences saved successfully! 🚀");
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

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Bar */}
        <div className="mb-6 sm:mb-8 pb-4 border-b border-white/10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Store & Invoice Settings</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Configure business identity, receipts, tax numbers, currency, and print presets
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={saveSettings} className="space-y-6">
          {/* Section 1: Store Branding & Identity */}
          <div className="bg-white/5 border border-white/10 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <Store className="text-green-400 w-5 h-5" />
              <h2 className="text-base sm:text-lg font-bold text-white">Business Identity & Branding</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Business / Store Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Luxury Retail"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +880 1700-000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Official Email</label>
                <input
                  type="email"
                  placeholder="e.g. contact@autopilotpos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Website Domain</label>
                <input
                  type="text"
                  placeholder="e.g. https://store.example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Tax / VAT Registration Number (BIN / GST)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BIN-001234567-0101"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Physical Outlet Address</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Level 3, Gulshan Avenue, Dhaka - 1212"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Logo Upload */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Store Logo</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {logoPreview && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 p-1 flex items-center justify-center">
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <label className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl bg-black/40 border border-dashed border-white/20 hover:border-green-500/50 cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-300 font-medium">Click to select logo file</span>
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
          </div>

          {/* Section 2: International Currency & Tax Preferences */}
          <div className="bg-white/5 border border-white/10 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <Globe className="text-blue-400 w-5 h-5" />
              <h2 className="text-base sm:text-lg font-bold text-white">International Currency & Tax Configuration</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Currency Symbol</label>
                <input
                  type="text"
                  placeholder="৳, $, €, £, AED, ₹"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Currency ISO Code</label>
                <input
                  type="text"
                  placeholder="BDT, USD, EUR, GBP, AED"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Symbol Placement</label>
                <select
                  value={currencyPosition}
                  onChange={(e) => setCurrencyPosition(e.target.value as any)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="BEFORE">Before Amount (e.g. ৳ 100.00)</option>
                  <option value="AFTER">After Amount (e.g. 100.00 ৳)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tax Label</label>
                <input
                  type="text"
                  placeholder="VAT, GST, Sales Tax, Tax"
                  value={taxLabel}
                  onChange={(e) => setTaxLabel(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Default Tax Rate (%)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Default Receipt Format</label>
                <select
                  value={receiptTemplate}
                  onChange={(e) => setReceiptTemplate(e.target.value as any)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="thermal_80mm">Thermal 80mm Standard</option>
                  <option value="thermal_58mm">Thermal 58mm Compact</option>
                  <option value="a4_standard">A4 Sheet Professional</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Receipt Footers & Policies */}
          <div className="bg-white/5 border border-white/10 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <Receipt className="text-yellow-400 w-5 h-5" />
              <h2 className="text-base sm:text-lg font-bold text-white">Invoice Footers & Return Policies</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Receipt Thank-You Message
                </label>
                <input
                  type="text"
                  placeholder="e.g. Thank you for shopping with us! Please come again."
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Return / Exchange Policy Notice
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Exchange available within 7 days with original invoice. No cash refund."
                  value={returnPolicy}
                  onChange={(e) => setReturnPolicy(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-green-500/20 active:scale-95 disabled:opacity-50"
            >
              <Save size={18} />
              <span>{isSaving ? "Saving Preferences..." : "Save All Settings"}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Printer, ShoppingCart, LayoutDashboard } from "lucide-react";

function InvoiceContent() {
  const params = useSearchParams();
  const invoice = params.get("invoice") || "INV-PROTOTYPE";
  const total = params.get("total") || "0";
  const itemsParam = params.get("items") || "[]";

  const [settings, setSettings] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(decodeURIComponent(itemsParam)));
    } catch {
      setItems([]);
    }

    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.success) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    loadSettings();
  }, [itemsParam]);

  const now = new Date();

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Printable Receipt Card */}
      <div className="bg-white text-black p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl print:p-0 print:shadow-none print:rounded-none">
        {/* Receipt Header */}
        <div className="text-center pb-6 border-b border-gray-200">
          {settings?.logo_url && (
            <img
              src={settings.logo_url}
              alt="Store Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mb-3 rounded-xl"
            />
          )}

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {settings?.store_name || "Autopilot POS Store"}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {settings?.address || "Universal Retail Outlet"}
          </p>
          {settings?.phone && (
            <p className="text-xs text-gray-500">Phone: {settings.phone}</p>
          )}
        </div>

        {/* Transaction Metadata */}
        <div className="grid grid-cols-2 gap-2 py-4 text-xs border-b border-gray-200">
          <div>
            <p className="text-gray-500">
              <span className="font-semibold text-gray-700">Invoice:</span> {invoice}
            </p>
            <p className="text-gray-500">
              <span className="font-semibold text-gray-700">Date:</span> {now.toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">
              <span className="font-semibold text-gray-700">Time:</span> {now.toLocaleTimeString()}
            </p>
            <p className="text-gray-500">
              <span className="font-semibold text-gray-700">Payment:</span> Cash / Paid
            </p>
          </div>
        </div>

        {/* Line Items List */}
        <div className="py-4 space-y-2.5 border-b border-gray-200">
          {items.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-2">No line items in preview</div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs sm:text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} $\times$ ৳{Number(item.sell_price || 0).toLocaleString()}
                  </p>
                </div>
                <span className="font-bold text-gray-900 shrink-0">
                  ৳{(Number(item.sell_price || 0) * item.quantity).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Totals Summary */}
        <div className="pt-4 space-y-1.5">
          <div className="flex justify-between text-base sm:text-lg font-bold border-t border-gray-900 pt-2">
            <span>Total Payable</span>
            <span>৳{Number(total || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Receipt Footer */}
        <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center text-xs text-gray-500">
          <p>Thank you for shopping with us! ❤️</p>
          <p className="text-[10px] text-gray-400 mt-1">Powered by Autopilot POS SaaS</p>
        </div>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95"
        >
          <Printer size={18} />
          <span>Print Receipt</span>
        </button>

        <Link
          href="/dashboard/sales"
          className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          <ShoppingCart size={18} />
          <span>New Sale</span>
        </Link>

        <Link
          href="/dashboard"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 py-3 px-4 rounded-xl text-sm transition-colors"
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </Link>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <Suspense fallback={<div className="text-white text-center py-12">Loading invoice...</div>}>
          <InvoiceContent />
        </Suspense>
      </main>
    </div>
  );
}
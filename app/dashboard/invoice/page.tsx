"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Printer, ShoppingCart, LayoutDashboard, Search, FileText } from "lucide-react";
import InvoiceReceipt from "@/components/InvoiceReceipt";
import { InvoiceData } from "@/lib/invoice-engine";

function InvoiceContent() {
  const params = useSearchParams();
  const invoiceParam = params.get("invoice");
  const idParam = params.get("id");

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<"thermal_58mm" | "thermal_80mm" | "a4_standard">("thermal_80mm");
  const [isLoading, setIsLoading] = useState(true);
  const [lookupQuery, setLookupQuery] = useState(invoiceParam || "");

  async function fetchInvoice(invoiceNo?: string, saleId?: string) {
    try {
      setIsLoading(true);
      let url = "/api/sales/invoice?";
      if (saleId) {
        url += `id=${encodeURIComponent(saleId)}`;
      } else if (invoiceNo) {
        url += `invoice_no=${encodeURIComponent(invoiceNo)}`;
      } else {
        // Fetch latest sale as default preview
        const salesRes = await fetch("/api/sales/list");
        const salesData = await salesRes.json();
        if (salesData.success && salesData.sales?.length > 0) {
          url += `id=${encodeURIComponent(salesData.sales[0].id)}`;
        } else {
          setIsLoading(false);
          return;
        }
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.invoice) {
        setInvoice(data.invoice);
        setSelectedTemplate(data.invoice.config?.receipt_template || "thermal_80mm");
      }
    } catch (err) {
      console.error("Failed to load invoice:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoice(invoiceParam || undefined, idParam || undefined);
  }, [invoiceParam, idParam]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lookupQuery.trim()) {
      fetchInvoice(lookupQuery.trim());
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Controls Toolbar (Hidden on Print) */}
      <div className="bg-gray-950 border border-white/10 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 no-print shadow-xl">
        {/* Lookup Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search invoice # (e.g. INV-STA-)..."
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-green-500 font-mono"
          />
        </form>

        {/* Template Switcher */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setSelectedTemplate("thermal_80mm")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedTemplate === "thermal_80mm"
                ? "bg-green-500 text-black shadow"
                : "text-gray-300 hover:text-white"
            }`}
          >
            80mm Thermal
          </button>
          <button
            type="button"
            onClick={() => setSelectedTemplate("thermal_58mm")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedTemplate === "thermal_58mm"
                ? "bg-green-500 text-black shadow"
                : "text-gray-300 hover:text-white"
            }`}
          >
            58mm Thermal
          </button>
          <button
            type="button"
            onClick={() => setSelectedTemplate("a4_standard")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedTemplate === "a4_standard"
                ? "bg-green-500 text-black shadow"
                : "text-gray-300 hover:text-white"
            }`}
          >
            A4 Sheet
          </button>
        </div>

        {/* Print Button */}
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <Printer size={16} />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Invoice Receipt Container */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400">Loading invoice data...</div>
      ) : !invoice ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-white">Invoice Not Found</h3>
          <p className="text-xs text-gray-400 mt-1">Please check the invoice number or select a sale from Order History.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 p-4 sm:p-8 rounded-3xl shadow-2xl flex justify-center overflow-x-auto print:border-none print:shadow-none print:p-0 print:bg-white">
          <InvoiceReceipt
            invoice={invoice}
            template={selectedTemplate}
            isReprint={false}
          />
        </div>
      )}

      {/* Quick Navigation Links (Hidden on print) */}
      <div className="flex flex-wrap items-center justify-center gap-3 no-print pt-2 pb-8">
        <Link
          href="/dashboard/sales"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
        >
          <ShoppingCart size={15} />
          <span>Back to POS Register</span>
        </Link>
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
        >
          <LayoutDashboard size={15} />
          <span>View All Orders</span>
        </Link>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-6 lg:p-8 flex justify-center">
        <Suspense fallback={<div className="text-white text-center py-20">Loading invoice viewer...</div>}>
          <InvoiceContent />
        </Suspense>
      </main>
    </div>
  );
}
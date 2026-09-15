"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageAccessGuard from "@/components/PageAccessGuard";
import { Receipt, Search, Printer, Calendar } from "lucide-react";
import InvoiceModal from "@/components/InvoiceModal";
import { InvoiceData } from "@/lib/invoice-engine";

export default function OrdersPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);

  async function loadSales() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/sales/list");
      const data = await res.json();
      if (data.success) {
        setSales(data.sales || []);
      }
    } catch (err) {
      console.error("Failed to load sales:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  async function handleOpenInvoice(saleId: string) {
    try {
      setLoadingInvoiceId(saleId);
      const res = await fetch(`/api/sales/invoice?id=${saleId}`);
      const data = await res.json();

      if (data.success && data.invoice) {
        setSelectedInvoice(data.invoice);
        setIsInvoiceModalOpen(true);
      } else {
        alert(data.message || "Failed to load invoice details");
      }
    } catch (err) {
      console.error("Failed to fetch invoice:", err);
      alert("Error loading invoice");
    } finally {
      setLoadingInvoiceId(null);
    }
  }

  const filteredSales = sales.filter(
    (s) =>
      (s.invoice_no || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.notes || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageAccessGuard permission={["canAccessPOS", "canViewFinancialReports", "canManageProducts"]}>
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Order History & Invoices</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
              Search historical transactions, view itemized receipts, and reprint invoices
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by invoice number (e.g. INV-), customer name, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:border-green-500 shadow-sm transition-colors"
          />
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 dark:text-gray-400">Loading order history...</div>
        ) : filteredSales.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center text-slate-500 dark:text-gray-400 shadow-sm">
            <Receipt size={36} className="mx-auto mb-2 opacity-40 text-slate-400 dark:text-gray-400" />
            <p className="text-base font-semibold text-slate-800 dark:text-white">No sales orders found</p>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Completed sales will automatically appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSales.map((sale) => {
              const createdAt = sale.created_at ? new Date(sale.created_at) : null;
              const isReprintLoading = loadingInvoiceId === sale.id;

              return (
                <div
                  key={sale.id}
                  className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 sm:p-5 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 shrink-0">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight font-mono">
                          {sale.invoice_no}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sale.payment_status === "PAID"
                              ? "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30"
                              : "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {sale.payment_status || "PAID"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-gray-400 mt-1">
                        {createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar size={13} />
                            {createdAt.toLocaleDateString()} at {createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {sale.customer_name && (
                          <span className="text-slate-600 dark:text-gray-300">
                            • Customer: <strong className="text-slate-900 dark:text-white">{sale.customer_name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 dark:text-gray-400 block">Total Amount</span>
                      <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400 font-mono">
                        ৳{Number(sale.total || 0).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isReprintLoading}
                      onClick={() => handleOpenInvoice(sale.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      <Printer size={15} />
                      <span>{isReprintLoading ? "Loading..." : "Reprint Receipt"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Invoice / Receipt Preview Modal with Reprint Mode */}
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          invoice={selectedInvoice}
          isReprint={true}
        />
      </main>
    </div>
    </PageAccessGuard>
  );
}
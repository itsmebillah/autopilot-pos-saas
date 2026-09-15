"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Receipt, Search, ExternalLink } from "lucide-react";

export default function OrdersPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const filteredSales = sales.filter((s) =>
    (s.invoice_no || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Sales Orders</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Order transactions history, receipts, and revenue logs
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by invoice number (e.g. INV-)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading order history...</div>
        ) : filteredSales.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-gray-400">
            No sales orders recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400 shrink-0">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                      {sale.invoice_no}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Date: {new Date(sale.created_at || Date.now()).toLocaleDateString()} at{" "}
                      {new Date(sale.created_at || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-gray-400 block">Total Amount</span>
                    <span className="text-base sm:text-lg font-bold text-green-400">
                      ৳{Number(sale.total || 0).toLocaleString()}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/invoice?invoice=${sale.invoice_no}&total=${sale.total}&items=[]`}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0"
                  >
                    <span>View</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
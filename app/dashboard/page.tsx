"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { TrendingUp, Package, Users, AlertTriangle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { signOut } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    lowStockProducts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dashboard");
      const data = await res.json();

      if (data.success) {
        setStats({
          totalProducts: data.totalProducts || 0,
          totalCustomers: data.totalCustomers || 0,
          totalSales: data.totalSales || 0,
          lowStockProducts: data.lowStockProducts || 0,
        });
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Compact Single-Row Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-0.5 truncate">
              Store operations overview & real-time metrics
            </p>
          </div>

          <button
            type="button"
            onClick={signOut}
            aria-label="Logout"
            className="shrink-0 flex items-center justify-center gap-1.5 min-h-[40px] px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/15 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white border border-red-500/20 dark:border-red-500/30 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer shadow-xs active:scale-95"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Total Sales */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Gross Sales</span>
              <div className="p-2 rounded-xl bg-green-500/15 text-green-600 dark:text-green-400">
                <TrendingUp size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-slate-900 dark:text-white font-mono">
              {isLoading ? "..." : `৳ ${stats.totalSales.toLocaleString()}`}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Aggregated sales total</p>
          </div>

          {/* Card 2: Products */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Total Products</span>
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <Package size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-slate-900 dark:text-white font-mono">
              {isLoading ? "..." : stats.totalProducts.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Active catalog items</p>
          </div>

          {/* Card 3: Customers */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Registered Customers</span>
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Users size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-slate-900 dark:text-white font-mono">
              {isLoading ? "..." : stats.totalCustomers.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">CRM profile records</p>
          </div>

          {/* Card 4: Low Stock Alert */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Low Stock Alert</span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-yellow-400">
                <AlertTriangle size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-amber-600 dark:text-yellow-400 font-mono">
              {isLoading ? "..." : stats.lowStockProducts.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Items at or below reorder level</p>
          </div>
        </div>

        {/* Operational Status */}
        <div className="mt-8 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Operational Readiness</h2>
          <p className="text-xs text-slate-600 dark:text-gray-400">
            All services operational. Ready for high-speed multi-terminal sales, barcode scanning, and thermal printing.
          </p>
        </div>
      </main>
    </div>
  );
}
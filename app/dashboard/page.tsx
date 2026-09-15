"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { TrendingUp, Package, Users, AlertTriangle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
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

  function handleLogout() {
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1">
              Store operations overview & real-time metrics
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="self-start sm:self-auto flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Total Sales */}
          <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-2xl hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-gray-400">Gross Sales</span>
              <div className="p-2 rounded-xl bg-green-500/20 text-green-400">
                <TrendingUp size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight">
              {isLoading ? "..." : `৳ ${stats.totalSales.toLocaleString()}`}
            </h2>
            <p className="text-xs text-gray-500 mt-2">Aggregated sales total</p>
          </div>

          {/* Card 2: Products */}
          <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-2xl hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-gray-400">Total Products</span>
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Package size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight">
              {isLoading ? "..." : stats.totalProducts.toLocaleString()}
            </h2>
            <p className="text-xs text-gray-500 mt-2">Active catalog items</p>
          </div>

          {/* Card 3: Customers */}
          <div className="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-2xl hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-gray-400">Customers</span>
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Users size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight">
              {isLoading ? "..." : stats.totalCustomers.toLocaleString()}
            </h2>
            <p className="text-xs text-gray-500 mt-2">Registered profiles</p>
          </div>

          {/* Card 4: Low Stock Alert */}
          <div className="bg-amber-500/10 border border-amber-500/30 p-5 sm:p-6 rounded-2xl hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-amber-300">Low Stock Alert</span>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <AlertTriangle size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-amber-200">
              {isLoading ? "..." : stats.lowStockProducts.toLocaleString()}
            </h2>
            <p className="text-xs text-amber-400/80 mt-2">Items $\le$ 5 stock remaining</p>
          </div>
        </div>
      </main>
    </div>
  );
}
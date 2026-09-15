"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { TrendingUp, Calendar, DollarSign, AlertTriangle } from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState({
    todaySales: 0,
    monthlySales: 0,
    totalProfit: 0,
    lowStock: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  async function loadReports() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/reports");
      const data = await res.json();
      if (data.success) {
        setStats({
          todaySales: data.todaySales || 0,
          monthlySales: data.monthlySales || 0,
          totalProfit: data.totalProfit || 0,
          lowStock: data.lowStock || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Business Reports</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
              Financial summaries, revenue metrics, and inventory health
            </p>
          </div>
        </div>

        {/* Reports KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Today Sales */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Today Sales</span>
              <div className="p-2 rounded-xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                <Calendar size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-slate-900 dark:text-white">
              {isLoading ? "..." : `৳ ${stats.todaySales.toLocaleString()}`}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Sales recorded today</p>
          </div>

          {/* Card 2: Monthly Sales */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Monthly Sales</span>
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <TrendingUp size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-slate-900 dark:text-white">
              {isLoading ? "..." : `৳ ${stats.monthlySales.toLocaleString()}`}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Gross revenue this month</p>
          </div>

          {/* Card 3: Total Profit */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Estimated Profit</span>
              <div className="p-2 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <DollarSign size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-purple-600 dark:text-purple-300">
              {isLoading ? "..." : `৳ ${stats.totalProfit.toLocaleString()}`}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Cumulative net margin</p>
          </div>

          {/* Card 4: Low Stock Alert */}
          <div className="bg-amber-500/10 border border-amber-500/30 p-5 sm:p-6 rounded-2xl hover:border-amber-500/50 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">Low Stock Items</span>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-amber-800 dark:text-amber-200">
              {isLoading ? "..." : stats.lowStock.toLocaleString()}
            </h2>
            <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-2">Items requiring restock</p>
          </div>
        </div>
      </main>
    </div>
  );
}
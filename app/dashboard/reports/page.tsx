"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageAccessGuard from "@/components/PageAccessGuard";
import { TrendingUp, Calendar, DollarSign, AlertTriangle, Package, Layers, PieChart, Info } from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState({
    todaySales: 0,
    monthlySales: 0,
    totalSales: 0,
    totalProfit: 0,
    totalLandedCost: 0,
    totalPurchaseCost: 0,
    totalAdditionalCost: 0,
    grossMarginPercent: 0,
    inventoryValuation: 0,
    totalInventoryUnits: 0,
    lowStock: 0,
    totalOrders: 0,
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
          totalSales: data.totalSales || 0,
          totalProfit: data.totalProfit || 0,
          totalLandedCost: data.totalLandedCost || 0,
          totalPurchaseCost: data.totalPurchaseCost || 0,
          totalAdditionalCost: data.totalAdditionalCost || 0,
          grossMarginPercent: data.grossMarginPercent || 0,
          inventoryValuation: data.inventoryValuation || 0,
          totalInventoryUnits: data.totalInventoryUnits || 0,
          lowStock: data.lowStock || 0,
          totalOrders: data.totalOrders || 0,
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
    <PageAccessGuard permission="canViewFinancialReports">
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Business Reports</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
              Authoritative financial summaries, landed cost structure, profit margins & inventory valuation
            </p>
          </div>
        </div>

        {/* Primary Financial KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Today Sales */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Today&apos;s Revenue</span>
              <div className="p-2 rounded-xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                <Calendar size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-slate-900 dark:text-white">
              {isLoading ? "..." : `৳${stats.todaySales.toLocaleString()}`}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Sales recorded today</p>
          </div>

          {/* Card 2: Total Revenue */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Total Sales Revenue</span>
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <TrendingUp size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-slate-900 dark:text-white">
              {isLoading ? "..." : `৳${stats.totalSales.toLocaleString()}`}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">{stats.totalOrders} total orders</p>
          </div>

          {/* Card 3: Gross Profit & Margin */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Gross Profit</span>
              <div className="p-2 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-300">
                {isLoading ? "..." : `৳${stats.totalProfit.toLocaleString()}`}
              </h2>
              {!isLoading && stats.grossMarginPercent > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  {stats.grossMarginPercent}% margin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Revenue minus Landed Cost</p>
          </div>

          {/* Card 4: Inventory Valuation */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">Inventory Valuation</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Package size={18} />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 tracking-tight text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : `৳${stats.inventoryValuation.toLocaleString()}`}
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">{stats.totalInventoryUnits} items in catalog stock</p>
          </div>
        </div>

        {/* Cost Structure Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Summary Breakdown Card */}
          <div className="lg:col-span-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Sold Goods Cost Breakdown</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-gray-400">Authoritative COGS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 block">Supplier Purchase Cost</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {isLoading ? "..." : `৳${stats.totalPurchaseCost.toLocaleString()}`}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-gray-500 mt-1 block">Direct supplier base price</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 block">Additional Acquisition Costs</span>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                  {isLoading ? "..." : `৳${stats.totalAdditionalCost.toLocaleString()}`}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-gray-500 mt-1 block">Packaging, freight & handling</span>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block">Total Landed Cost</span>
                <span className="text-xl font-bold text-blue-800 dark:text-blue-200 mt-1 block">
                  {isLoading ? "..." : `৳${stats.totalLandedCost.toLocaleString()}`}
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 block">Purchase + Additional Cost</span>
              </div>
            </div>

            {/* Visual Formula Bar */}
            <div className="mt-5 p-4 rounded-xl bg-slate-100 dark:bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-gray-300">Purchase (৳{stats.totalPurchaseCost.toLocaleString()})</span>
                <span className="text-slate-400 font-bold">+</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">Additional (৳{stats.totalAdditionalCost.toLocaleString()})</span>
                <span className="text-slate-400 font-bold">=</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">Landed Cost (৳{stats.totalLandedCost.toLocaleString()})</span>
              </div>
              <div className="text-slate-500 dark:text-gray-400">
                Gross Profit = ৳{stats.totalSales.toLocaleString()} - ৳{stats.totalLandedCost.toLocaleString()} = <span className="font-bold text-purple-600 dark:text-purple-400">৳{stats.totalProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Low Stock & Inventory Health Card */}
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Inventory Health</h3>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                  <span className="text-xs text-slate-500 dark:text-gray-400">Total Stock On Hand</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.totalInventoryUnits} units</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <AlertTriangle size={15} />
                    <span className="text-xs font-semibold">Low Stock Warnings</span>
                  </div>
                  <span className="text-sm font-bold text-amber-800 dark:text-amber-200">{stats.lowStock} items</span>
                </div>
              </div>
            </div>

            {/* Costing Policy Note */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] text-slate-500 dark:text-gray-400 flex items-start gap-2 border border-slate-200 dark:border-white/5">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Costing Architecture:</strong> Product acquisition costs (box, freight, handling) are allocated to Landed Cost. General store operating expenses (rent, staff salaries) remain separate.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
    </PageAccessGuard>
  );
}
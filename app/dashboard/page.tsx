"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardPage() {

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    lowStockProducts: 0,
  });

  async function loadDashboard() {

    const res = await fetch("/api/dashboard");

    const data = await res.json();

    if (data.success) {

      setStats({
        totalProducts: data.totalProducts,
        totalCustomers: data.totalCustomers,
        totalSales: data.totalSales,
        lowStockProducts: data.lowStockProducts,
      });

    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex">

      <Sidebar />

      <div className="flex-1 p-8">

        <div className="flex items-center justify-between mb-10">

          <div>
            <h1 className="text-4xl font-bold">
              Dashboard
            </h1>

            <p className="text-gray-400 mt-2">
              Welcome back 🚀
            </p>
          </div>

          <button className="bg-red-500 px-4 py-2 rounded-xl">
            Logout
          </button>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

          <div className="bg-white/10 p-6 rounded-2xl">

            <p className="text-gray-400">
              Total Sales
            </p>

            <h2 className="text-3xl font-bold mt-3">
              ৳ {stats.totalSales}
            </h2>

          </div>

          <div className="bg-white/10 p-6 rounded-2xl">

            <p className="text-gray-400">
              Products
            </p>

            <h2 className="text-3xl font-bold mt-3">
              {stats.totalProducts}
            </h2>

          </div>

          <div className="bg-white/10 p-6 rounded-2xl">

            <p className="text-gray-400">
              Customers
            </p>

            <h2 className="text-3xl font-bold mt-3">
              {stats.totalCustomers}
            </h2>

          </div>

          <div className="bg-red-500/20 p-6 rounded-2xl border border-red-500/20">

            <p className="text-red-300">
              Low Stock
            </p>

            <h2 className="text-3xl font-bold mt-3">
              {stats.lowStockProducts}
            </h2>

          </div>

        </div>

      </div>

    </main>
  );
}
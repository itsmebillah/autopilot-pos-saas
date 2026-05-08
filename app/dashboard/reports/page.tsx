"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function ReportsPage() {
const [stats, setStats] =
  useState({
    todaySales: 0,
    monthlySales: 0,
    totalProfit: 0,
    lowStock: 0,
  });

async function loadReports() {

  const res =
    await fetch("/api/reports");

  const data =
    await res.json();

  if (data.success) {

    setStats({
      todaySales:
        data.todaySales,
      monthlySales:
        data.monthlySales,
      totalProfit:
        data.totalProfit,
      lowStock:
        data.lowStock,
    });

  }

}

useEffect(() => {
  loadReports();
}, []);
  return (
    <main className="min-h-screen bg-black text-white flex">

      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-4xl font-bold mb-8">
          Reports
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

          <div className="bg-white/10 p-6 rounded-2xl">

            <p className="text-gray-400">
              Today Sales
            </p>

            <h2 className="text-3xl font-bold mt-3">
              ৳ {stats.todaySales}
            </h2>

          </div>

          <div className="bg-white/10 p-6 rounded-2xl">

            <p className="text-gray-400">
              Monthly Sales
            </p>

            <h2 className="text-3xl font-bold mt-3">
              ৳ {stats.monthlySales}
            </h2>

          </div>

          <div className="bg-white/10 p-6 rounded-2xl">

            <p className="text-gray-400">
              Profit
            </p>

            <h2 className="text-3xl font-bold mt-3">
              ৳ {stats.totalProfit}
            </h2>

          </div>

          <div className="bg-white/10 p-6 rounded-2xl">

            <p className="text-gray-400">
              Low Stock
            </p>

            <h2 className="text-3xl font-bold mt-3">
              {stats.lowStock}
            </h2>

          </div>

        </div>

      </div>

    </main>
  );
}
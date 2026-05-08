"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function OrdersPage() {

  const [sales, setSales] = useState<any[]>([]);

  async function loadSales() {

    const res = await fetch("/api/sales/list");

    const data = await res.json();

    if (data.success) {
      setSales(data.sales);
    }
  }

  useEffect(() => {
    loadSales();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex">

      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-4xl font-bold mb-8">
          Sales History
        </h1>

        <div className="space-y-4">

          {sales.map((sale) => (

            <div
              key={sale.id}
              className="bg-white/10 p-5 rounded-2xl"
            >

              <h2 className="text-xl font-bold">
                {sale.invoice_no}
              </h2>

              <p className="text-gray-400 mt-2">
                Total: ৳ {sale.total}
              </p>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}
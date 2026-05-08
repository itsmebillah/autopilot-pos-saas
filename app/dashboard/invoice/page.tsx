"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function InvoicePage() {

    const [settings, setSettings] =
  useState<any>(null);

async function loadSettings() {

  const res = await fetch(
    "/api/settings"
  );

  const data = await res.json();

  if (data.success) {
    setSettings(data.settings);
  }
}

useEffect(() => {
  loadSettings();
}, []);

if (typeof window === "undefined") {
  return null;
}
  const params = useSearchParams();

  const invoice = params.get("invoice");
  const total = params.get("total");

  const now = new Date();

  const items = JSON.parse(
    decodeURIComponent(
      params.get("items") || "[]"
    )
  );

  return (
    <main className="min-h-screen bg-black text-white flex">

      <Sidebar />

      <div className="flex-1 p-8">

        <div className="max-w-2xl mx-auto bg-white text-black p-8 rounded-3xl">

          <h1 className="text-4xl font-bold text-center">
            Invoice
          </h1>
{settings?.logo_url && (

  <img
    src={settings.logo_url}
    alt="Logo"
    className="w-24 h-24 object-cover mx-auto mb-4 rounded-2xl"
  />

)}
          <div className="text-center mb-8 mt-2">

  <p className="text-xl font-bold">
    {settings?.store_name || "Store"}
  </p>

  <p className="text-gray-500">
    Autopilot POS Receipt
  </p>

  <p className="text-sm text-gray-500 mt-1">
    {settings?.address || ""}
  </p>

  <p className="text-sm text-gray-500">
    Phone: {settings?.phone || ""}
  </p>

</div>

          <div className="space-y-6">

            {/* Top Info */}
            <div className="grid grid-cols-2 gap-10 text-sm border-b pb-5">

              <div className="space-y-2">

                <div className="flex gap-3">
                  <span className="font-semibold">
                    Date:
                  </span>

                  <span>
                    {now.toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-3">
                  <span className="font-semibold">
                    Time:
                  </span>

                  <span>
                    {now.toLocaleTimeString()}
                  </span>
                </div>

              </div>

              <div className="space-y-2 text-right">

                <div className="flex justify-end gap-3">

                  <span className="font-semibold">
                    Invoice No:
                  </span>

                  <span>
                    {invoice}
                  </span>

                </div>

                <div className="flex justify-end gap-3">

                  <span className="font-semibold">
                    Seller:
                  </span>

                  <span>
                    Masum
                  </span>

                </div>

                <div className="flex justify-end gap-3">

                  <span className="font-semibold">
                    Payment:
                  </span>

                  <span>
                    Cash
                  </span>

                </div>

              </div>

            </div>

            {/* Products */}
            <div className="space-y-3">

              {items.map((item: any) => (

                <div
                  key={item.id}
                  className="bg-gray-100 p-4 rounded-xl space-y-2"
                >

                  <div className="flex justify-between">

                    <p className="font-semibold">
                      {item.name}
                    </p>

                    <p>
                      ৳ {item.sell_price * item.quantity}
                    </p>

                  </div>

                  <div className="flex justify-between text-sm text-gray-600">

                    <p>
                      Qty: {item.quantity}
                    </p>

                    <p>
                      Unit Price: ৳ {item.sell_price}
                    </p>

                  </div>

                </div>

              ))}

            </div>

            {/* Total */}
            <div className="border-t pt-5">

              <div className="flex justify-between text-2xl font-bold">

                <span>Total</span>

                <span>
                  ৳ {total}
                </span>

              </div>

            </div>

          </div>

          <p className="text-center text-gray-500 mt-10">
            Thank you for your purchase ❤️
          </p>

          <button
            onClick={() => window.print()}
            className="mt-10 bg-green-500 text-white px-6 py-3 rounded-2xl"
          >
            Print Invoice
            
          </button>
<div className="flex gap-4 mt-5">

  <a
    href="/dashboard/sales"
    className="bg-black text-white px-6 py-3 rounded-2xl"
  >
    New Sale
  </a>

  <a
    href="/dashboard"
    className="bg-gray-300 px-6 py-3 rounded-2xl"
  >
    Dashboard
  </a>

</div>
        </div>

      </div>

    </main>
  );
}
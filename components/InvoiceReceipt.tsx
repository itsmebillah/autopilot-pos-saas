"use client";

import React from "react";
import { InvoiceData, formatCurrency } from "@/lib/invoice-engine";
import { generateBarcodeSVG } from "@/lib/barcode-engine";

interface InvoiceReceiptProps {
  invoice: InvoiceData;
  template?: "thermal_58mm" | "thermal_80mm" | "a4_standard";
  isReprint?: boolean;
}

export default function InvoiceReceipt({
  invoice,
  template = "thermal_80mm",
  isReprint = false,
}: InvoiceReceiptProps) {
  const { business, transaction, customer, items, totals, payments, config } = invoice;

  const invoiceBarcodeSvg = generateBarcodeSVG(transaction.invoice_no, {
    width: 220,
    height: 40,
    showText: false,
  });

  return (
    <div className="invoice-receipt-wrapper select-text text-black bg-white">
      {/* Global & Print CSS with Unicode Font Fallback & Tabular Numerals */}
      <style jsx global>{`
        .invoice-receipt-wrapper,
        .invoice-receipt-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Bengali", "SolaimanLipi", "Kalpurush", "Hind Siliguri", Arial, sans-serif !important;
          color: #000000 !important;
        }

        .receipt-tabular-nums {
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
        }

        @media print {
          @page {
            margin: ${template === "a4_standard" ? "10mm" : "0mm"};
            size: ${template === "thermal_58mm" ? "58mm auto" : template === "thermal_80mm" ? "80mm auto" : "A4 portrait"};
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Bengali", "SolaimanLipi", "Kalpurush", "Hind Siliguri", Arial, sans-serif !important;
          }
          nav, aside, header, .no-print, button {
            display: none !important;
          }
          .invoice-receipt-container {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: ${template === "thermal_58mm" ? "3px" : template === "thermal_80mm" ? "6px" : "0px"} !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* RENDERER ACCORDING TO TEMPLATE */}
      {template === "thermal_58mm" && (
        <Thermal58mmLayout
          business={business}
          transaction={transaction}
          customer={customer}
          items={items}
          totals={totals}
          payments={payments}
          config={config}
          isReprint={isReprint}
          barcodeSvg={invoiceBarcodeSvg}
        />
      )}

      {template === "thermal_80mm" && (
        <Thermal80mmLayout
          business={business}
          transaction={transaction}
          customer={customer}
          items={items}
          totals={totals}
          payments={payments}
          config={config}
          isReprint={isReprint}
          barcodeSvg={invoiceBarcodeSvg}
        />
      )}

      {template === "a4_standard" && (
        <A4StandardLayout
          business={business}
          transaction={transaction}
          customer={customer}
          items={items}
          totals={totals}
          payments={payments}
          config={config}
          isReprint={isReprint}
          barcodeSvg={invoiceBarcodeSvg}
        />
      )}
    </div>
  );
}

/**
 * Helper to determine if store_name should be shown separately
 */
function shouldShowStoreName(businessName?: string, storeName?: string): boolean {
  if (!storeName || !businessName) return false;
  const b = businessName.trim().toLowerCase();
  const s = storeName.trim().toLowerCase();
  return s !== b && s !== "main outlet" && s !== "universal retail outlet" && s !== "autopilot pos store";
}

/* ==========================================================================
   1. THERMAL 58MM COMPACT LAYOUT (Width ~58mm / 218px)
   ========================================================================== */
function Thermal58mmLayout({
  business,
  transaction,
  customer,
  items,
  totals,
  payments,
  config,
  isReprint,
  barcodeSvg,
}: any) {
  const showStore = shouldShowStoreName(business.name, business.store_name);

  return (
    <div className="invoice-receipt-container bg-white text-black p-2.5 mx-auto w-full max-w-[218px] text-[10px] leading-tight">
      {/* Reprint Banner */}
      {isReprint && (
        <div className="text-center font-bold uppercase tracking-wider text-[9px] border-y border-black py-0.5 mb-1">
          *** DUPLICATE COPY ***
        </div>
      )}

      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-black space-y-0.5">
        {business.logo_url && (
          <img src={business.logo_url} alt="Logo" className="w-8 h-8 object-contain mx-auto mb-1" />
        )}
        <h1 className="font-bold text-xs uppercase tracking-tight">{business.name}</h1>
        {showStore && <p className="text-[9px] font-semibold text-gray-800">{business.store_name}</p>}
        {business.address && <p className="text-[9px] text-gray-700">{business.address}</p>}
        {business.phone && <p className="text-[9px]">Ph: {business.phone}</p>}
        {business.tax_number && (
          <p className="text-[9px] font-semibold">{business.tax_label || "VAT"}: {business.tax_number}</p>
        )}
      </div>

      {/* Transaction Details */}
      <div className="py-1.5 border-b border-dashed border-black text-[9px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>Inv: {transaction.invoice_no}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>{transaction.date_formatted}</span>
          <span>{transaction.time_formatted}</span>
        </div>
        {transaction.cashier_name && (
          <div className="flex justify-between text-gray-700">
            <span>Biller:</span>
            <span>{transaction.cashier_name}</span>
          </div>
        )}
        {customer?.name && (
          <div className="pt-0.5 border-t border-dotted border-gray-400">
            <span>Customer: {customer.name} {customer.phone ? `(${customer.phone})` : ""}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="py-1.5 border-b border-dashed border-black">
        <div className="flex justify-between font-bold border-b border-black pb-0.5 mb-1 text-[9px]">
          <span className="flex-1">ITEM</span>
          <span className="w-16 text-center">QTY x PR</span>
          <span className="w-14 text-right">TOTAL</span>
        </div>
        <div className="space-y-1.5">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="space-y-0.5">
              <div className="font-semibold break-words">{item.name}</div>
              {item.serial_numbers?.length > 0 && (
                <div className="text-[8px] text-gray-600">S/N: {item.serial_numbers.join(", ")}</div>
              )}
              <div className="flex justify-between text-[9.5px] receipt-tabular-nums">
                <span className="text-gray-700">
                  {item.quantity} × {formatCurrency(item.unit_price, config)}
                </span>
                <span className="font-bold text-right">
                  {formatCurrency(item.total, config)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Totals */}
      <div className="py-1.5 border-b border-dashed border-black space-y-1 text-[9.5px] receipt-tabular-nums">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(totals.subtotal, config)}</span>
        </div>
        {totals.discount_total > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Discount:</span>
            <span className="font-medium text-green-700">
              {formatCurrency(-totals.discount_total, config)}
            </span>
          </div>
        )}
        {totals.tax_total > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>{config.tax_label || "Tax"}:</span>
            <span>{formatCurrency(totals.tax_total, config)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-[11px] border-t border-black pt-1">
          <span>GRAND TOTAL:</span>
          <span>{formatCurrency(totals.grand_total, config)}</span>
        </div>
        <div className="flex justify-between pt-0.5">
          <span>Paid ({payments[0]?.method || "CASH"}):</span>
          <span>{formatCurrency(totals.paid_amount, config)}</span>
        </div>
        {totals.change_amount > 0 && (
          <div className="flex justify-between font-semibold">
            <span>Change:</span>
            <span>{formatCurrency(totals.change_amount, config)}</span>
          </div>
        )}
        {totals.due_amount > 0 && (
          <div className="flex justify-between font-bold text-red-600">
            <span>Balance Due:</span>
            <span>{formatCurrency(totals.due_amount, config)}</span>
          </div>
        )}
      </div>

      {/* Barcode & Footer */}
      <div className="pt-2 text-center text-[8.5px] space-y-1">
        <div
          className="flex justify-center my-1 scale-90"
          dangerouslySetInnerHTML={{ __html: barcodeSvg }}
        />
        <p className="font-semibold">{transaction.invoice_no}</p>
        <p className="italic text-[8px] text-gray-700">{config.footer_message}</p>
        {config.return_policy && (
          <p className="text-[7.5px] text-gray-600">{config.return_policy}</p>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   2. THERMAL 80MM DETAILED LAYOUT (Width ~80mm / 300px)
   ========================================================================== */
function Thermal80mmLayout({
  business,
  transaction,
  customer,
  items,
  totals,
  payments,
  config,
  isReprint,
  barcodeSvg,
}: any) {
  const showStore = shouldShowStoreName(business.name, business.store_name);

  return (
    <div className="invoice-receipt-container bg-white text-black p-4 mx-auto w-full max-w-[300px] text-xs leading-normal">
      {/* Reprint Banner */}
      {isReprint && (
        <div className="bg-black text-white text-center font-bold uppercase tracking-widest text-[9.5px] py-0.5 rounded mb-2.5">
          *** DUPLICATE REPRINT ***
        </div>
      )}

      {/* Header */}
      <div className="text-center pb-2.5 border-b-2 border-dashed border-gray-400 space-y-0.5">
        {business.logo_url && (
          <img
            src={business.logo_url}
            alt="Store Logo"
            className="w-12 h-12 object-contain mx-auto mb-1.5 rounded"
          />
        )}
        <h1 className="font-bold text-sm uppercase tracking-tight text-gray-950">{business.name}</h1>
        {showStore && (
          <p className="text-xs font-semibold text-gray-700">{business.store_name}</p>
        )}
        {business.address && (
          <p className="text-[11px] text-gray-600">{business.address}</p>
        )}
        {business.phone && (
          <p className="text-[11px] text-gray-600">Tel: {business.phone}</p>
        )}
        {business.email && (
          <p className="text-[10px] text-gray-500">{business.email}</p>
        )}
        {business.tax_number && (
          <p className="text-[10.5px] font-semibold text-gray-800 mt-0.5">
            {business.tax_label || "VAT"} REG: {business.tax_number}
          </p>
        )}
      </div>

      {/* Meta Information */}
      <div className="py-2 border-b border-dashed border-gray-300 text-[11px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>Invoice No:</span>
          <span>{transaction.invoice_no}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Date & Time:</span>
          <span>{transaction.date_formatted} {transaction.time_formatted}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Biller / Cashier:</span>
          <span>{transaction.cashier_name || "Admin"}</span>
        </div>
        {customer && (
          <div className="pt-1 border-t border-dotted border-gray-300 mt-1">
            <div className="flex justify-between font-semibold text-gray-800">
              <span>Customer:</span>
              <span>{customer.name}</span>
            </div>
            {customer.phone && (
              <div className="flex justify-between text-gray-600">
                <span>Phone:</span>
                <span>{customer.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Line Items Table */}
      <div className="py-2.5 border-b-2 border-dashed border-gray-400">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-900 font-bold text-[10.5px]">
              <th className="pb-1">Description</th>
              <th className="pb-1 text-center w-8">Qty</th>
              <th className="pb-1 text-right w-16">Price</th>
              <th className="pb-1 text-right w-18">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 receipt-tabular-nums">
            {items.map((item: any, idx: number) => (
              <tr key={idx} className="align-top text-[11px]">
                <td className="py-1 pr-1">
                  <div className="font-semibold text-gray-900 leading-tight">{item.name}</div>
                  {item.sku && <div className="text-[9.5px] text-gray-500">SKU: {item.sku}</div>}
                  {item.serial_numbers?.length > 0 && (
                    <div className="text-[9.5px] text-gray-600">SN: {item.serial_numbers.join(", ")}</div>
                  )}
                  {item.batch_number && (
                    <div className="text-[9.5px] text-gray-500">Batch: {item.batch_number}</div>
                  )}
                </td>
                <td className="py-1 text-center font-medium">{item.quantity}</td>
                <td className="py-1 text-right text-gray-700 whitespace-nowrap">
                  {formatCurrency(item.unit_price, config)}
                </td>
                <td className="py-1 text-right font-bold text-gray-900 whitespace-nowrap">
                  {formatCurrency(item.total, config)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Totals */}
      <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-xs receipt-tabular-nums">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal:</span>
          <span>{formatCurrency(totals.subtotal, config)}</span>
        </div>
        {totals.discount_total > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Special Discount:</span>
            <span className="text-green-700 font-medium">
              {formatCurrency(-totals.discount_total, config)}
            </span>
          </div>
        )}
        {totals.tax_total > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>{config.tax_label || "VAT"}:</span>
            <span>{formatCurrency(totals.tax_total, config)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t-2 border-gray-900 pt-1.5 text-gray-950">
          <span>GRAND TOTAL:</span>
          <span>{formatCurrency(totals.grand_total, config)}</span>
        </div>

        {/* Tender Breakdown */}
        <div className="pt-1.5 border-t border-dotted border-gray-300 space-y-0.5">
          {payments.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between text-[11px] text-gray-700">
              <span className="uppercase font-medium">Paid ({p.method}):</span>
              <span>{formatCurrency(p.amount, config)}</span>
            </div>
          ))}
          {totals.change_amount > 0 && (
            <div className="flex justify-between text-xs font-semibold text-gray-900 pt-0.5">
              <span>Change Returned:</span>
              <span>{formatCurrency(totals.change_amount, config)}</span>
            </div>
          )}
          {totals.due_amount > 0 && (
            <div className="flex justify-between text-xs font-bold text-red-600 pt-0.5">
              <span>Remaining Balance:</span>
              <span>{formatCurrency(totals.due_amount, config)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Barcode & Policy Footer */}
      <div className="pt-2.5 text-center space-y-1.5">
        <div
          className="flex justify-center my-1.5"
          dangerouslySetInnerHTML={{ __html: barcodeSvg }}
        />
        <p className="text-[10px] text-gray-600 tracking-wider font-bold">
          {transaction.invoice_no}
        </p>

        {config.footer_message && (
          <p className="font-medium text-xs text-gray-800">{config.footer_message}</p>
        )}

        {config.return_policy && (
          <div className="bg-gray-50 border border-gray-200 rounded p-1.5 text-[9.5px] text-gray-600 leading-tight text-left">
            <span className="font-bold block text-gray-800 mb-0.5">Return & Exchange Policy:</span>
            {config.return_policy}
          </div>
        )}

        <div className="pt-1 text-[8.5px] text-gray-400">
          Powered by Autopilot POS Platform
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   3. A4 PROFESSIONAL INVOICE LAYOUT (Standard A4 Sheet)
   ========================================================================== */
function A4StandardLayout({
  business,
  transaction,
  customer,
  items,
  totals,
  payments,
  config,
  isReprint,
  barcodeSvg,
}: any) {
  const showStore = shouldShowStoreName(business.name, business.store_name);

  return (
    <div className="invoice-receipt-container bg-white text-black p-8 sm:p-12 mx-auto w-full max-w-4xl text-sm leading-normal shadow-lg print:shadow-none print:p-0">
      {/* Reprint Banner */}
      {isReprint && (
        <div className="bg-black text-white text-center font-bold uppercase tracking-widest text-xs py-1 rounded mb-5">
          *** OFFICIAL INVOICE COPY / DUPLICATE REPRINT ***
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-gray-900">
        <div className="flex items-center gap-4">
          {business.logo_url && (
            <img
              src={business.logo_url}
              alt="Company Logo"
              className="w-16 h-16 object-contain rounded-xl border border-gray-100 p-1"
            />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950">
              {business.name}
            </h1>
            {showStore && (
              <p className="text-sm font-semibold text-gray-700">{business.store_name}</p>
            )}
            <p className="text-xs text-gray-600 max-w-sm mt-0.5">{business.address}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 mt-1">
              {business.phone && <span>Tel: {business.phone}</span>}
              {business.email && <span>Email: {business.email}</span>}
              {business.website && <span>Web: {business.website}</span>}
            </div>
            {business.tax_number && (
              <p className="text-xs font-bold text-gray-900 mt-1">
                {business.tax_label || "VAT"} REG NO: {business.tax_number}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Number & Date Badge */}
        <div className="text-left sm:text-right bg-gray-50 border border-gray-200 rounded-2xl p-4 min-w-[220px]">
          <span className="text-xs uppercase font-bold tracking-wider text-gray-500 block mb-1">
            TAX INVOICE
          </span>
          <span className="text-base font-bold text-gray-950 block">
            {transaction.invoice_no}
          </span>
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs space-y-1 text-gray-600">
            <div className="flex justify-between gap-4">
              <span className="font-medium">Date:</span>
              <span>{transaction.date_formatted}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-medium">Time:</span>
              <span>{transaction.time_formatted}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-medium">Cashier:</span>
              <span>{transaction.cashier_name || "Admin"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To & Status Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 bg-gray-50/80 border border-gray-200 rounded-xl text-xs">
        <div>
          <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] mb-1">
            Billed To:
          </h3>
          {customer ? (
            <div className="space-y-0.5 text-gray-700">
              <p className="font-bold text-sm text-gray-950">{customer.name}</p>
              {customer.phone && <p>Phone: {customer.phone}</p>}
              {customer.email && <p>Email: {customer.email}</p>}
              {customer.address && <p>Address: {customer.address}</p>}
            </div>
          ) : (
            <p className="text-gray-500 italic">Walk-in Customer (General Counter Sale)</p>
          )}
        </div>

        <div className="sm:border-l sm:border-gray-200 sm:pl-6">
          <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] mb-1">
            Payment Status:
          </h3>
          <div className="space-y-1 text-gray-700">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className="font-bold uppercase text-green-700">{transaction.payment_status}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tender Method:</span>
              <span>{payments.map((p: any) => p.method).join(", ") || "CASH"}</span>
            </div>
            {transaction.notes && (
              <div className="pt-1 text-gray-500 italic">Notes: {transaction.notes}</div>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="my-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-bold text-xs uppercase tracking-wider border-y-2 border-gray-900">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3 text-center w-14">Qty</th>
              <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
              <th className="py-2.5 px-3 text-right w-24">Discount</th>
              <th className="py-2.5 px-3 text-right w-20">Tax</th>
              <th className="py-2.5 px-3 text-right w-32">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-xs receipt-tabular-nums">
            {items.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="py-2.5 px-3 text-center text-gray-500">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-gray-950">{item.name}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 mt-0.5">
                    {item.sku && <span>SKU: {item.sku}</span>}
                    {item.barcode && <span>Barcode: {item.barcode}</span>}
                  </div>
                  {item.serial_numbers?.length > 0 && (
                    <div className="text-[11px] text-indigo-700 mt-0.5">
                      S/N: {item.serial_numbers.join(", ")}
                    </div>
                  )}
                  {item.batch_number && (
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      Batch: {item.batch_number} {item.expiry_date ? `(Exp: ${item.expiry_date})` : ""}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-semibold">{item.quantity}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatCurrency(item.unit_price, config)}</td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap text-gray-600">
                  {item.discount_amount > 0 ? formatCurrency(-item.discount_amount, config) : "—"}
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap text-gray-600">
                  {item.tax_amount > 0 ? formatCurrency(item.tax_amount, config) : "—"}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-gray-950 whitespace-nowrap">
                  {formatCurrency(item.total, config)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Box & Policy */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mt-6 pt-4 border-t border-gray-200">
        {/* Left Side: Policy & Barcode */}
        <div className="flex-1 space-y-4 text-xs max-w-md">
          {config.return_policy && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="font-bold text-gray-900 block mb-1">Return & Warranty Terms:</span>
              <p className="text-gray-600 leading-relaxed text-[11px]">{config.return_policy}</p>
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <div
              className="p-2 border border-gray-200 rounded-xl inline-block bg-white"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
            <div>
              <p className="text-xs font-bold text-gray-900">{transaction.invoice_no}</p>
              <p className="text-[11px] text-gray-500 italic mt-0.5">{config.footer_message}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Totals Summary Grid */}
        <div className="w-full sm:w-80 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2 receipt-tabular-nums">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal Amount:</span>
            <span className="font-semibold">{formatCurrency(totals.subtotal, config)}</span>
          </div>
          {totals.discount_total > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Special Discount:</span>
              <span className="font-semibold">{formatCurrency(-totals.discount_total, config)}</span>
            </div>
          )}
          {totals.tax_total > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>{config.tax_label || "VAT"}:</span>
              <span className="font-semibold">{formatCurrency(totals.tax_total, config)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t-2 border-gray-900 pt-2 text-gray-950">
            <span>GRAND TOTAL:</span>
            <span>{formatCurrency(totals.grand_total, config)}</span>
          </div>

          <div className="pt-2 border-t border-gray-200 space-y-1 text-xs">
            <div className="flex justify-between text-gray-700">
              <span>Paid Amount:</span>
              <span>{formatCurrency(totals.paid_amount, config)}</span>
            </div>
            {totals.change_amount > 0 && (
              <div className="flex justify-between text-gray-900 font-semibold">
                <span>Change Returned:</span>
                <span>{formatCurrency(totals.change_amount, config)}</span>
              </div>
            )}
            {totals.due_amount > 0 && (
              <div className="flex justify-between text-red-600 font-bold">
                <span>Due Balance:</span>
                <span>{formatCurrency(totals.due_amount, config)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signature Row */}
      <div className="hidden print:flex justify-between items-end pt-14 mt-8 border-t border-gray-200 text-xs text-gray-600">
        <div className="text-center">
          <div className="w-44 border-t border-gray-400 mb-1" />
          <span>Customer Signature</span>
        </div>
        <div className="text-center">
          <div className="w-44 border-t border-gray-400 mb-1" />
          <span>Authorized Signature & Seal</span>
        </div>
      </div>
    </div>
  );
}

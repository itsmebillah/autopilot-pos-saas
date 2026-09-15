"use client";

import { useState } from "react";
import { X, Printer, ShoppingCart, FileText, CheckCircle2 } from "lucide-react";
import { InvoiceData } from "@/lib/invoice-engine";
import InvoiceReceipt from "@/components/InvoiceReceipt";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
  isReprint?: boolean;
  onNewSale?: () => void;
}

export default function InvoiceModal({
  isOpen,
  onClose,
  invoice,
  isReprint = false,
  onNewSale,
}: InvoiceModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<"thermal_58mm" | "thermal_80mm" | "a4_standard">(
    invoice?.config.receipt_template || "thermal_80mm"
  );

  if (!isOpen || !invoice) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header Bar (Hidden on print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-gray-900/80 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isReprint ? "Reprint Invoice / Receipt" : "Sale Completed Successfully!"}
                </h2>
                {isReprint && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Reprint
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                {invoice.transaction.invoice_no} • {invoice.transaction.date_formatted}
              </p>
            </div>
          </div>

          {/* Template Switcher Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-black/50 p-1 rounded-2xl border border-slate-300 dark:border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedTemplate("thermal_80mm")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedTemplate === "thermal_80mm"
                  ? "bg-green-500 text-slate-950 font-bold shadow-md"
                  : "text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-white/10"
              }`}
            >
              80mm Thermal
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate("thermal_58mm")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedTemplate === "thermal_58mm"
                  ? "bg-green-500 text-slate-950 font-bold shadow-md"
                  : "text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-white/10"
              }`}
            >
              58mm Thermal
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate("a4_standard")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedTemplate === "a4_standard"
                  ? "bg-green-500 text-slate-950 font-bold shadow-md"
                  : "text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-white/10"
              }`}
            >
              A4 Sheet
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="hidden sm:flex p-2 text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Receipt Preview Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-zinc-900/90 flex justify-center items-start">
          <div className="bg-white rounded-2xl shadow-2xl p-2 sm:p-4 w-full flex justify-center overflow-x-auto">
            <InvoiceReceipt
              invoice={invoice}
              template={selectedTemplate}
              isReprint={isReprint}
            />
          </div>
        </div>

        {/* Modal Footer Controls (Hidden on print) */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
            <FileText size={16} />
            <span>Standard browser print dialog with printer-optimized layout</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onNewSale && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewSale();
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ShoppingCart size={16} />
                <span>New Sale</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-slate-950 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>{isReprint ? "Reprint Invoice" : "Print Receipt"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-2.5 text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

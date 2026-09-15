"use client";

import { useState } from "react";
import { X, Layers, Plus, Minus, CheckCircle2 } from "lucide-react";

export interface StockAdjustProduct {
  id: string;
  name: string;
  barcode: string;
  stock: number;
}

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: StockAdjustProduct | null;
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  product,
}: StockAdjustmentModalProps) {
  const [adjustType, setAdjustType] = useState<"ADD" | "SUBTRACT" | "SET">("ADD");
  const [quantity, setQuantity] = useState<string>("1");
  const [reason, setReason] = useState<string>("PURCHASE_RECEIVE");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !product) return null;

  const currentStock = Number(product.stock) || 0;
  const qtyNum = parseFloat(quantity) || 0;

  let newStock = currentStock;
  if (adjustType === "ADD") newStock = currentStock + qtyNum;
  if (adjustType === "SUBTRACT") newStock = currentStock - qtyNum;
  if (adjustType === "SET") newStock = qtyNum;

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    if (qtyNum <= 0 && adjustType !== "SET") {
      alert("Please specify a quantity greater than 0");
      return;
    }
    if (newStock < 0) {
      alert("Stock cannot be negative");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          adjustType,
          quantity: qtyNum,
          reason,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message || "Stock adjusted successfully");
        onSuccess();
        onClose();
      } else {
        alert(data.message || "Failed to adjust stock");
      }
    } catch (err) {
      console.error("Adjustment error:", err);
      alert("An error occurred while adjusting stock");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Adjust Stock Quantity</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">Barcode: {product.barcode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAdjustSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">Product:</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{product.name}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setAdjustType("ADD");
                setReason("PURCHASE_RECEIVE");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                adjustType === "ADD"
                  ? "bg-green-500 text-slate-950 shadow-lg shadow-green-500/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <Plus size={14} /> Add Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustType("SUBTRACT");
                setReason("DAMAGE_LOSS");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                adjustType === "SUBTRACT"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <Minus size={14} /> Reduce
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustType("SET");
                setReason("AUDIT_ADJUSTMENT");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                adjustType === "SET"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              Set Total
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-gray-300 block mb-1.5">
              {adjustType === "SET" ? "New Total Stock Level" : "Adjustment Quantity"}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-sm font-bold text-center outline-none focus:border-green-500 shadow-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-gray-300 block mb-1.5">Reason Code (Audit Trail)</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs outline-none focus:border-green-500 shadow-sm"
            >
              <option value="PURCHASE_RECEIVE">📦 Purchase Receive (New Shipment)</option>
              <option value="DAMAGE_LOSS">⚠️ Damage / Broken / Expired Loss</option>
              <option value="AUDIT_ADJUSTMENT">🔍 Physical Stock Count Audit</option>
              <option value="RETURN_IN">🔄 Customer / Supplier Return</option>
              <option value="CORRECTION">✏️ Manual Data Correction</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-gray-300 block mb-1.5">Notes / Reference (Optional)</label>
            <input
              type="text"
              placeholder="e.g. PO#1042 or shelf recount"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs outline-none focus:border-green-500 shadow-sm"
            />
          </div>

          {/* Impact preview */}
          <div className="bg-slate-100 dark:bg-black/40 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-gray-400">Current: {currentStock}</span>
            <span className="text-slate-400 dark:text-gray-500">→</span>
            <span className={`font-bold ${newStock < 0 ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
              New Balance: {newStock}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || newStock < 0}
              className="px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={15} /> {submitting ? "Saving..." : "Confirm Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

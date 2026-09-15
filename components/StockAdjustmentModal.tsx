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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-green-500/20 text-green-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Adjust Stock Quantity</h2>
              <p className="text-xs text-gray-400 font-mono">Barcode: {product.barcode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAdjustSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Product:</span>
            <span className="text-xs font-bold text-white truncate max-w-[200px]">{product.name}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setAdjustType("ADD");
                setReason("PURCHASE_RECEIVE");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                adjustType === "ADD"
                  ? "bg-green-500 text-black shadow-lg shadow-green-500/20"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
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
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                adjustType === "SUBTRACT"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
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
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                adjustType === "SET"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Set Total
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1.5">
              {adjustType === "SET" ? "New Total Stock Level" : "Adjustment Quantity"}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-black border border-gray-700 text-white text-sm font-bold text-center outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1.5">Reason Code (Audit Trail)</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-black border border-gray-700 text-white text-xs outline-none focus:border-green-500"
            >
              <option value="PURCHASE_RECEIVE">📦 Purchase Receive (New Shipment)</option>
              <option value="DAMAGE_LOSS">⚠️ Damage / Broken / Expired Loss</option>
              <option value="AUDIT_ADJUSTMENT">🔍 Physical Stock Count Audit</option>
              <option value="RETURN_IN">🔄 Customer / Supplier Return</option>
              <option value="CORRECTION">✏️ Manual Data Correction</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1.5">Notes / Reference (Optional)</label>
            <input
              type="text"
              placeholder="e.g. PO#1042 or shelf recount"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-black border border-gray-700 text-white text-xs outline-none focus:border-green-500"
            />
          </div>

          {/* Impact preview */}
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs">
            <span className="text-gray-400">Current: {currentStock}</span>
            <span className="text-gray-500">→</span>
            <span className={`font-bold ${newStock < 0 ? "text-red-400" : "text-green-400"}`}>
              New Balance: {newStock}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || newStock < 0}
              className="px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 size={15} /> {submitting ? "Saving..." : "Confirm Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

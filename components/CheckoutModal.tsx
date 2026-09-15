"use client";

import { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  User,
  Percent,
  Receipt,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { InvoiceData } from "@/lib/invoice-engine";
import { generateQuickCashPresets, calculatePaymentSummary } from "@/lib/quick-cash";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  onSaleComplete: (invoice: InvoiceData) => void;
  currencySymbol?: string;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  onSaleComplete,
  currencySymbol = "৳",
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paidAmountInput, setPaidAmountInput] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Split multi-payment state
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: string; ref?: string }[]>([
    { method: "CASH", amount: "" },
    { method: "CARD", amount: "" },
  ]);

  // Cart financial calculations
  const rawSubtotal = cart.reduce(
    (sum, item) => sum + Number(item.sell_price || 0) * item.quantity,
    0
  );

  const discountVal = Math.max(0, parseFloat(discountAmount) || 0);
  let calculatedDiscount = 0;
  if (discountType === "PERCENT") {
    calculatedDiscount = (rawSubtotal * Math.min(100, discountVal)) / 100;
  } else {
    calculatedDiscount = Math.min(rawSubtotal, discountVal);
  }

  const grandTotal = Math.max(0, rawSubtotal - calculatedDiscount);

  // Quick cash presets calculated dynamically from grandTotal
  const quickCashPresets = generateQuickCashPresets(grandTotal);

  // Synchronized payment amount calculation
  let effectivePaid = 0;
  if (isSplitPayment) {
    effectivePaid = splitPayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );
  } else {
    // If input is empty string, default to exact payable
    effectivePaid = paidAmountInput === "" ? grandTotal : Math.max(0, parseFloat(paidAmountInput) || 0);
  }

  const summary = calculatePaymentSummary(grandTotal, effectivePaid);

  // Sync default payable on modal open or cart/discount change
  useEffect(() => {
    if (isOpen) {
      if (paidAmountInput === "" || parseFloat(paidAmountInput) === rawSubtotal) {
        setPaidAmountInput(grandTotal.toString());
      }
    }
  }, [isOpen, grandTotal, rawSubtotal]);

  if (!isOpen || cart.length === 0) return null;

  function handleSelectPreset(amount: number) {
    setIsSplitPayment(false);
    setPaymentMethod("CASH");
    setPaidAmountInput(amount.toString());
  }

  function handleMethodChange(method: string) {
    setPaymentMethod(method);
    if (method !== "CASH") {
      // Non-cash defaults to exact payable
      setPaidAmountInput(grandTotal.toString());
    }
  }

  function handleToggleSplit(enable: boolean) {
    setIsSplitPayment(enable);
    if (enable) {
      // Initialize split with half-and-half or exact due
      const half = Math.round(grandTotal / 2);
      setSplitPayments([
        { method: "CASH", amount: half.toString() },
        { method: "CARD", amount: (grandTotal - half).toString() },
      ]);
    } else {
      setPaidAmountInput(grandTotal.toString());
    }
  }

  function handleAddSplitTender() {
    const currentSum = splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const remaining = Math.max(0, grandTotal - currentSum);
    setSplitPayments([...splitPayments, { method: "MOBILE", amount: remaining > 0 ? remaining.toString() : "" }]);
  }

  function handleRemoveSplitTender(index: number) {
    if (splitPayments.length <= 1) return;
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  }

  function handleUpdateSplitTender(index: number, field: "method" | "amount" | "ref", value: string) {
    const updated = [...splitPayments];
    updated[index] = { ...updated[index], [field]: value };
    setSplitPayments(updated);
  }

  async function handleSubmitCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0 || isSubmitting) return;

    let finalPayments: { method: string; amount: number; transaction_ref?: string }[] = [];

    if (isSplitPayment) {
      finalPayments = splitPayments
        .filter((p) => (parseFloat(p.amount) || 0) > 0)
        .map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0,
          transaction_ref: p.ref?.trim() || undefined,
        }));

      if (finalPayments.length === 0) {
        alert("Please enter at least one split payment amount");
        return;
      }
    } else {
      finalPayments = [
        {
          method: paymentMethod,
          amount: summary.paid,
        },
      ];
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sales/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          customer_name: customerName.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          discount_amount: calculatedDiscount,
          tax_amount: 0,
          total: grandTotal,
          paid_amount: summary.paid,
          change_amount: summary.change,
          due_amount: summary.due,
          payments: finalPayments,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.invoice) {
        onSaleComplete(data.invoice);
        onClose();
      } else {
        alert(data.message || "Failed to complete sale");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("An unexpected network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 dark:bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-white/15 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-gray-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-green-500/15 text-green-600 dark:text-green-400">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Complete Sale & Checkout</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {cart.reduce((s, i) => s + i.quantity, 0)} Items • Total: {currencySymbol}
                {grandTotal.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmitCheckout} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Customer Details Box */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-300">
              <User size={15} className="text-green-600 dark:text-green-400" />
              <span>Customer Details (Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Walk-in Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:border-green-500"
              />
              <input
                type="text"
                placeholder="Phone (e.g. +880 17...)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Discount & Adjustments */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-300">
                <Percent size={15} className="text-amber-500 dark:text-yellow-400" />
                <span>Order Discount</span>
              </div>
              <div className="flex items-center bg-slate-200 dark:bg-black/50 rounded-xl border border-slate-300 dark:border-white/10 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDiscountType("FIXED")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    discountType === "FIXED"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white"
                      : "text-slate-600 dark:text-gray-400"
                  }`}
                >
                  {currencySymbol} Fixed
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("PERCENT")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    discountType === "PERCENT"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white"
                      : "text-slate-600 dark:text-gray-400"
                  }`}
                >
                  % Percent
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="any"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="Discount value"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold font-mono focus:outline-none focus:border-green-500"
              />
              {calculatedDiscount > 0 && (
                <div className="shrink-0 text-xs font-bold text-green-600 dark:text-green-400 font-mono">
                  -{currencySymbol}{calculatedDiscount.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Payment Tender Box */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-gray-300">Payment Tender</span>
              <button
                type="button"
                onClick={() => handleToggleSplit(!isSplitPayment)}
                className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline"
              >
                {isSplitPayment ? "← Switch to Single Tender" : "+ Split Multi-Payment"}
              </button>
            </div>

            {!isSplitPayment ? (
              <div className="space-y-3">
                {/* Method Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "CASH", label: "Cash", icon: Banknote },
                    { id: "CARD", label: "Card", icon: CreditCard },
                    { id: "MOBILE", label: "Mobile (MFS)", icon: Smartphone },
                    { id: "BANK", label: "Bank Transfer", icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleMethodChange(m.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-xs font-semibold gap-1.5 min-h-[50px] ${
                          isSelected
                            ? "bg-green-500/15 border-green-500 text-green-700 dark:text-green-400 dark:bg-green-500/20 shadow-sm"
                            : "bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-slate-300 dark:hover:border-white/20"
                        }`}
                      >
                        <Icon size={18} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Cash Presets (If Cash Selected) */}
                {paymentMethod === "CASH" && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold">
                      Quick Cash Presets:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {quickCashPresets.map((amt, idx) => {
                        const isExact = idx === 0;
                        const isCurrentActive = parseFloat(paidAmountInput) === amt;
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleSelectPreset(amt)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all min-h-[38px] ${
                              isCurrentActive
                                ? "bg-green-600 text-white shadow-md"
                                : isExact
                                ? "bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-white/25"
                                : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10"
                            }`}
                          >
                            {isExact ? `Exact (${currencySymbol}${amt.toLocaleString()})` : `${currencySymbol}${amt.toLocaleString()}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Received Tender Input */}
                <div className="pt-1">
                  <label className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold block mb-1">
                    Received Tender Amount ({currencySymbol}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder={`Enter amount (Payable: ${grandTotal})`}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-base font-bold font-mono focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            ) : (
              /* Split-Tender Multi Payment Grid */
              <div className="space-y-3">
                <span className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold block">
                  Enter tender amounts for each payment method:
                </span>
                {splitPayments.map((p, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-white dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/10">
                    <select
                      value={p.method}
                      onChange={(e) => handleUpdateSplitTender(idx, "method", e.target.value)}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="MOBILE">Mobile (BKash/Nagad)</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CREDIT">Store Credit</option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={p.amount}
                      onChange={(e) => handleUpdateSplitTender(idx, "amount", e.target.value)}
                      placeholder="Amount"
                      className="flex-1 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:border-green-500"
                    />

                    <input
                      type="text"
                      value={p.ref || ""}
                      onChange={(e) => handleUpdateSplitTender(idx, "ref", e.target.value)}
                      placeholder="Txn Ref (Optional)"
                      className="w-full sm:w-36 px-3 py-2 rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none"
                    />

                    {splitPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplitTender(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors self-end sm:self-center"
                        title="Remove method"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSplitTender}
                  className="mt-1 text-xs font-semibold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={15} /> Add Another Payment Method
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <input
            type="text"
            placeholder="Optional order notes / invoice remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:border-green-500"
          />

          {/* Financial Summary Card */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 space-y-2 text-xs transition-colors">
            <div className="flex justify-between text-slate-600 dark:text-gray-300 font-medium">
              <span>Subtotal:</span>
              <span className="font-mono">{currencySymbol}{rawSubtotal.toLocaleString()}</span>
            </div>
            {calculatedDiscount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                <span>Discount:</span>
                <span className="font-mono">-{currencySymbol}{calculatedDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/10 pt-2">
              <span>Net Payable:</span>
              <span className="font-mono text-green-600 dark:text-green-400">
                {currencySymbol}{grandTotal.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700 dark:text-gray-300 pt-1.5 border-t border-slate-200 dark:border-white/10 font-mono font-bold text-xs">
              <span>Tendered Paid: {currencySymbol}{summary.paid.toLocaleString()}</span>
              {summary.change > 0 ? (
                <span className="text-amber-600 dark:text-yellow-400 font-extrabold bg-amber-100 dark:bg-yellow-500/20 px-2 py-0.5 rounded-lg">
                  Change: {currencySymbol}{summary.change.toLocaleString()}
                </span>
              ) : summary.due > 0 ? (
                <span className="text-red-600 dark:text-red-400 font-extrabold bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded-lg">
                  Due: {currencySymbol}{summary.due.toLocaleString()}
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400 font-bold">
                  ✓ Exact Paid (Change: {currencySymbol}0)
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-gray-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/10 transition-colors min-h-[46px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (summary.paid === 0 && grandTotal > 0)}
              className="flex-[2] py-3 px-4 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-300 dark:disabled:bg-gray-800 text-white font-bold text-sm shadow-lg shadow-green-600/30 transition-all flex items-center justify-center gap-2 min-h-[46px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Complete Sale ({currencySymbol}{grandTotal.toLocaleString()})</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, CreditCard, Banknote, Smartphone, Building2, User, Percent, Receipt, Check, ArrowRight } from "lucide-react";
import { InvoiceData } from "@/lib/invoice-engine";

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

  // Split payment state
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number }[]>([
    { method: "CASH", amount: 0 },
  ]);

  if (!isOpen || cart.length === 0) return null;

  const rawSubtotal = cart.reduce(
    (sum, item) => sum + Number(item.sell_price || 0) * item.quantity,
    0
  );

  const discountVal = parseFloat(discountAmount) || 0;
  let calculatedDiscount = 0;
  if (discountType === "PERCENT") {
    calculatedDiscount = (rawSubtotal * Math.min(100, Math.max(0, discountVal))) / 100;
  } else {
    calculatedDiscount = Math.min(rawSubtotal, Math.max(0, discountVal));
  }

  const grandTotal = Math.max(0, rawSubtotal - calculatedDiscount);

  // Single payment calculation
  const enteredPaid = paidAmountInput === "" ? grandTotal : parseFloat(paidAmountInput) || 0;
  const currentPaid = isSplitPayment
    ? splitPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : enteredPaid;

  const changeAmount = Math.max(0, currentPaid - grandTotal);
  const dueAmount = Math.max(0, grandTotal - currentPaid);

  function handleQuickCash(amount: number) {
    setIsSplitPayment(false);
    setPaymentMethod("CASH");
    setPaidAmountInput(amount.toString());
  }

  function handleAddSplitTender() {
    setSplitPayments([...splitPayments, { method: "CARD", amount: dueAmount }]);
  }

  function handleRemoveSplitTender(index: number) {
    if (splitPayments.length <= 1) return;
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  }

  function handleUpdateSplitTender(index: number, field: "method" | "amount", value: any) {
    const updated = [...splitPayments];
    updated[index] = { ...updated[index], [field]: value };
    setSplitPayments(updated);
  }

  async function handleSubmitCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;

    const finalPayments = isSplitPayment
      ? splitPayments.filter((p) => p.amount > 0)
      : [{ method: paymentMethod, amount: currentPaid }];

    if (finalPayments.length === 0) {
      alert("Please specify at least one payment amount");
      return;
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
          paid_amount: currentPaid,
          change_amount: changeAmount,
          due_amount: dueAmount,
          payments: finalPayments,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.invoice) {
        onSaleComplete(data.invoice);
        onClose();
      } else {
        alert(data.message || "Checkout failed to complete");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("An error occurred during checkout");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-gray-950 border border-white/15 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-gray-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-green-500/20 text-green-400">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Complete Sale & Checkout</h2>
              <p className="text-xs text-gray-400">
                {cart.reduce((s, i) => s + i.quantity, 0)} Items • Total: {currencySymbol}
                {grandTotal.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmitCheckout} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Customer Details Box */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <User size={15} className="text-green-400" />
              <span>Customer Information (Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Walk-in Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-green-500"
              />
              <input
                type="text"
                placeholder="Phone (e.g. +880 17...)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Discount & Order Adjustments */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <Percent size={15} className="text-yellow-400" />
                <span>Order Discount</span>
              </div>
              <div className="flex items-center bg-black/50 rounded-xl border border-white/10 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDiscountType("FIXED")}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    discountType === "FIXED" ? "bg-white/20 text-white" : "text-gray-400"
                  }`}
                >
                  {currencySymbol} Fixed
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("PERCENT")}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    discountType === "PERCENT" ? "bg-white/20 text-white" : "text-gray-400"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-green-500"
              />
              {calculatedDiscount > 0 && (
                <div className="shrink-0 text-xs font-semibold text-green-400">
                  -{currencySymbol}{calculatedDiscount.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">Payment Tender</span>
              <button
                type="button"
                onClick={() => setIsSplitPayment(!isSplitPayment)}
                className="text-xs font-bold text-green-400 hover:underline"
              >
                {isSplitPayment ? "Single Tender" : "+ Split Multi-Payment"}
              </button>
            </div>

            {!isSplitPayment ? (
              <div className="space-y-3">
                {/* Method Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "CASH", label: "Cash", icon: Banknote },
                    { id: "CARD", label: "Card", icon: CreditCard },
                    { id: "MOBILE", label: "Mobile / MFS", icon: Smartphone },
                    { id: "BANK", label: "Bank Transfer", icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-xs font-semibold gap-1.5 ${
                          isSelected
                            ? "bg-green-500/20 border-green-500/80 text-green-400 shadow-md"
                            : "bg-black/40 border-white/10 text-gray-300 hover:border-white/20"
                        }`}
                      >
                        <Icon size={18} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Cash Presets (If Cash) */}
                {paymentMethod === "CASH" && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] text-gray-400 font-medium">Quick Cash Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickCash(grandTotal)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-mono"
                      >
                        Exact ({currencySymbol}{grandTotal.toLocaleString()})
                      </button>
                      {[100, 500, 1000, 2000, 5000].map((amt) => {
                        if (amt < grandTotal && amt !== 1000) return null;
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleQuickCash(amt)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 text-xs font-mono"
                          >
                            {currencySymbol}{amt.toLocaleString()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Paid Amount Input */}
                <div className="pt-1">
                  <label className="text-[11px] text-gray-400 block mb-1">Received Tender Amount:</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder={`Enter amount (Default: ${grandTotal})`}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm font-bold font-mono focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            ) : (
              /* Multi-Payment Tender Grid */
              <div className="space-y-2.5">
                {splitPayments.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={p.method}
                      onChange={(e) => handleUpdateSplitTender(idx, "method", e.target.value)}
                      className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-semibold focus:outline-none"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="MOBILE">Mobile Banking</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CREDIT">Store Credit</option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={p.amount || ""}
                      onChange={(e) =>
                        handleUpdateSplitTender(idx, "amount", parseFloat(e.target.value) || 0)
                      }
                      placeholder="Amount"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-green-500"
                    />

                    {splitPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplitTender(idx)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSplitTender}
                  className="mt-2 text-xs font-semibold text-green-400 hover:underline flex items-center gap-1"
                >
                  + Add Another Payment Method
                </button>
              </div>
            )}
          </div>

          {/* Transaction Notes */}
          <input
            type="text"
            placeholder="Optional order notes / invoice remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-green-500"
          />

          {/* Bottom Financial Summary Card */}
          <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/5 border border-green-500/30 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal:</span>
              <span className="font-mono">{currencySymbol}{rawSubtotal.toLocaleString()}</span>
            </div>
            {calculatedDiscount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount:</span>
                <span className="font-mono">-{currencySymbol}{calculatedDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white border-t border-white/10 pt-2">
              <span>Net Payable:</span>
              <span className="font-mono text-green-400">{currencySymbol}{grandTotal.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-gray-300 pt-1 border-t border-white/5 font-mono">
              <span>Paid: {currencySymbol}{currentPaid.toLocaleString()}</span>
              {changeAmount > 0 ? (
                <span className="text-yellow-400 font-bold">
                  Change: {currencySymbol}{changeAmount.toLocaleString()}
                </span>
              ) : dueAmount > 0 ? (
                <span className="text-red-400 font-bold">
                  Due: {currencySymbol}{dueAmount.toLocaleString()}
                </span>
              ) : (
                <span className="text-green-400 font-bold flex items-center gap-1">
                  <Check size={14} /> Paid in Full
                </span>
              )}
            </div>
          </div>

          {/* Action Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-green-500/20 active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Generating Invoice & Stock Deduction...</span>
              ) : (
                <>
                  <span>Complete Sale & Print Invoice</span>
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

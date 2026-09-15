"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Camera,
  Barcode,
} from "lucide-react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import CameraBarcodeScanner from "@/components/CameraBarcodeScanner";
import CheckoutModal from "@/components/CheckoutModal";
import InvoiceModal from "@/components/InvoiceModal";
import { InvoiceData } from "@/lib/invoice-engine";

export default function SalesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState("৳");

  async function loadProducts() {
    try {
      const res = await fetch("/api/products/list");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings?.currency) {
        setCurrencySymbol(data.settings.currency);
      }
    } catch {
      // Non-blocking
    }
  }

  useEffect(() => {
    loadProducts();
    loadSettings();
  }, []);

  const addToCart = useCallback(
    (product: any) => {
      setCart((prevCart) => {
        const existing = prevCart.find((item) => item.id === product.id);
        if (existing) {
          if (existing.quantity >= Number(product.stock)) {
            alert(`Cannot add more than available stock of ${product.stock}`);
            return prevCart;
          }
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          return [
            ...prevCart,
            {
              ...product,
              quantity: 1,
            },
          ];
        }
      });
    },
    []
  );

  // Handle scanned barcode (from hardware scanner or mobile camera)
  const handleScannedBarcode = useCallback(
    (scannedCode: string) => {
      const trimmed = scannedCode.trim().toLowerCase();
      const matched = products.find(
        (p) => (p.barcode || "").toLowerCase() === trimmed || (p.id || "").toLowerCase() === trimmed
      );

      if (matched) {
        addToCart(matched);
        setLastScannedFeedback(`Added ${matched.name}`);
        setTimeout(() => setLastScannedFeedback(null), 1500);
      } else {
        setLastScannedFeedback(`Barcode "${scannedCode}" not found`);
        setTimeout(() => setLastScannedFeedback(null), 2000);
      }
    },
    [products, addToCart]
  );

  // Global Hardware USB/Bluetooth Scanner hook
  useBarcodeScanner({
    onScan: handleScannedBarcode,
    enabled: true,
  });

  function updateQuantity(productId: string, delta: number) {
    const existing = cart.find((item) => item.id === productId);
    if (!existing) return;

    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter((item) => item.id !== productId));
      return;
    }
    if (newQty > Number(existing.stock)) {
      alert(`Cannot exceed available stock of ${existing.stock}`);
      return;
    }

    setCart(
      cart.map((item) => (item.id === productId ? { ...item, quantity: newQty } : item))
    );
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter((item) => item.id !== productId));
  }

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) => sum + Number(item.sell_price || 0) * item.quantity,
    0
  );

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category || "General")))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || (p.category || "General") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  function handleOpenCheckout() {
    if (cart.length === 0) {
      alert("Cart is empty! Please add products before checking out.");
      return;
    }
    setIsCheckoutModalOpen(true);
  }

  function handleSaleComplete(invoice: InvoiceData) {
    setCompletedInvoice(invoice);
    setIsInvoiceModalOpen(true);
    setCart([]);
    setMobileCartOpen(false);
    loadProducts(); // refresh stock numbers
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 flex flex-col min-h-0">
        {/* Top Title Bar */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 pb-3 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sales POS</h1>
            <p className="text-xs sm:text-sm text-gray-400">Point of Sale Register & Invoice Checkout</p>
          </div>

          {/* Cart summary badge on mobile */}
          <button
            type="button"
            onClick={() => setMobileCartOpen(!mobileCartOpen)}
            className="lg:hidden flex items-center gap-2 bg-green-500 text-black px-3.5 py-2 rounded-xl text-sm font-semibold shadow-lg active:scale-95 transition-transform"
          >
            <ShoppingCart size={18} />
            <span>{totalItemsCount}</span>
            <span className="font-bold">{currencySymbol}{total.toLocaleString()}</span>
          </button>
        </div>

        {/* Search, Barcode Scanner & Category Filter */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by product name, SKU, or scan barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="flex items-center gap-2 bg-green-500 text-black hover:bg-green-400 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all shrink-0"
              title="Scan Barcode with Camera"
            >
              <Camera size={18} />
              <span className="hidden sm:inline">Camera Scan</span>
            </button>
          </div>

          {/* Scanned Feedback Pill */}
          {lastScannedFeedback && (
            <div className="bg-green-500/20 border border-green-500/40 text-green-400 text-xs px-3.5 py-2 rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
              <Barcode size={16} />
              <span>{lastScannedFeedback}</span>
            </div>
          )}

          {/* Category Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-white text-black shadow-md"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main 2-Column POS Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 items-start">
          {/* Left: Product Catalog Grid (7 Cols on desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0">
            {filteredProducts.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-gray-400">
                <p className="text-sm">No products found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                {filteredProducts.map((p) => {
                  const inStock = Number(p.stock) > 0;
                  const itemInCart = cart.find((c) => c.id === p.id);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!inStock}
                      onClick={() => addToCart(p)}
                      className={`relative bg-white/5 border rounded-2xl p-3 text-left transition-all flex flex-col justify-between group ${
                        !inStock
                          ? "opacity-40 border-white/5 cursor-not-allowed"
                          : "border-white/10 hover:border-green-500/60 hover:bg-white/10 active:scale-97 cursor-pointer"
                      }`}
                    >
                      {itemInCart && (
                        <span className="absolute top-2 right-2 bg-green-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                          {itemInCart.quantity}
                        </span>
                      )}

                      <div>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block truncate">
                          {p.category || "General"}
                        </span>
                        <h2 className="text-xs sm:text-sm font-bold text-white mt-1 leading-snug line-clamp-2">
                          {p.name}
                        </h2>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-xs sm:text-sm font-extrabold text-green-400 font-mono">
                            {currencySymbol}{Number(p.sell_price || 0).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            inStock ? "text-gray-400" : "text-red-400"
                          }`}
                        >
                          {inStock ? `${p.stock} in stock` : "Out of stock"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Cart & Checkout Summary (5 Cols on desktop) */}
          <div
            className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-gray-950 border-l border-white/10 p-4 sm:p-5 flex flex-col justify-between transition-transform duration-300 shadow-2xl lg:static lg:z-auto lg:w-full lg:col-span-5 xl:col-span-4 lg:rounded-3xl lg:border lg:bg-white/5 ${
              mobileCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
            }`}
          >
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-green-500 w-5 h-5" />
                <h2 className="font-bold text-base text-white">Current Order</h2>
                <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-semibold">
                  {totalItemsCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileCartOpen(false)}
                  className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Cart Line Items List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-[calc(100vh-320px)] lg:max-h-[380px] pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                  <ShoppingCart size={32} className="opacity-30" />
                  <p className="text-xs">Cart is empty. Tap products or scan barcode to add items.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-white truncate">{item.name}</h3>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {currencySymbol}{Number(item.sell_price || 0).toLocaleString()} $\times$ {item.quantity} ={" "}
                        <span className="text-green-400 font-bold">
                          {currencySymbol}{(Number(item.sell_price || 0) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Minus size={12} />
                      </button>

                      <span className="w-6 text-center text-xs font-bold font-mono">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Plus size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 rounded-lg text-red-400 hover:bg-red-500/20 flex items-center justify-center ml-1"
                        aria-label="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Financial Summary & Checkout */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>Subtotal</span>
                <span className="font-mono">{currencySymbol}{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg sm:text-xl font-bold text-white">
                <span>Total Amount</span>
                <span className="text-green-400 font-mono">{currencySymbol}{total.toLocaleString()}</span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                  cart.length > 0
                    ? "bg-green-500 text-black hover:bg-green-400 cursor-pointer active:scale-98 shadow-lg shadow-green-500/20"
                    : "bg-white/10 text-gray-500 cursor-not-allowed"
                }`}
              >
                <CheckCircle2 size={18} />
                <span>Complete & Print Invoice</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Camera Barcode Scanner Modal */}
        <CameraBarcodeScanner
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={(code) => {
            handleScannedBarcode(code);
          }}
          continuous={true}
        />

        {/* Checkout Modal (Payment, Tender, Split Payment) */}
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          cart={cart}
          onSaleComplete={handleSaleComplete}
          currencySymbol={currencySymbol}
        />

        {/* Post-Sale Invoice Preview & Print Modal */}
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          invoice={completedInvoice}
          onNewSale={() => {
            setIsInvoiceModalOpen(false);
          }}
        />
      </main>
    </div>
  );
}
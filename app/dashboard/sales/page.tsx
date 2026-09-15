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
  ArrowLeft,
  X,
  Camera,
  Barcode,
} from "lucide-react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import CameraBarcodeScanner from "@/components/CameraBarcodeScanner";
import CheckoutModal from "@/components/CheckoutModal";
import InvoiceModal from "@/components/InvoiceModal";
import { InvoiceData } from "@/lib/invoice-engine";

import { useAuth } from "@/lib/auth-context";

export default function SalesPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartInitialized, setIsCartInitialized] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState("৳");

  // Restore tenant-isolated cart or initialize clean empty cart
  useEffect(() => {
    if (typeof window === "undefined") return;
    const userId = user?.id || "guest";
    const storeId = user?.activeStore?.id || "default";
    const storageKey = `pos_cart_${userId}_${storeId}`;

    try {
      // Clear legacy/un-scoped keys
      localStorage.removeItem("pos_cart");
      localStorage.removeItem("cart");
      localStorage.removeItem("demo_cart");
    } catch {}

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validItems = parsed.filter(
            (item: any) => item && item.id && Number(item.quantity) > 0 && Number(item.sell_price || 0) >= 0
          );
          setCart(validItems);
          setIsCartInitialized(true);
          return;
        }
      }
    } catch {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }

    setCart([]);
    setIsCartInitialized(true);
  }, [user?.id, user?.activeStore?.id]);

  // Sync cart changes to tenant-isolated storage
  useEffect(() => {
    if (!isCartInitialized || typeof window === "undefined") return;
    const userId = user?.id || "guest";
    const storeId = user?.activeStore?.id || "default";
    const storageKey = `pos_cart_${userId}_${storeId}`;

    try {
      if (cart.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(cart));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {}
  }, [cart, isCartInitialized, user?.id, user?.activeStore?.id]);

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

  // Handle browser back button state synchronization
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      if (isCheckoutModalOpen) {
        setIsCheckoutModalOpen(false);
        return;
      }
      if (mobileCartOpen) {
        setMobileCartOpen(false);
        return;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isCheckoutModalOpen, mobileCartOpen]);

  function toggleMobileCart(open: boolean) {
    if (open && typeof window !== "undefined") {
      window.history.pushState({ posStep: "cart" }, "");
    } else if (!open && typeof window !== "undefined" && window.history.state?.posStep === "cart") {
      window.history.back();
    }
    setMobileCartOpen(open);
  }

  function handleOpenCheckout() {
    if (cart.length === 0) {
      alert("Cart is empty! Please add products before checking out.");
      return;
    }
    if (typeof window !== "undefined") {
      window.history.pushState({ posStep: "checkout" }, "");
    }
    setIsCheckoutModalOpen(true);
  }

  function handleCloseCheckout() {
    if (typeof window !== "undefined" && window.history.state?.posStep === "checkout") {
      window.history.back();
    }
    setIsCheckoutModalOpen(false);
  }

  function handleSaleComplete(invoice: InvoiceData) {
    setCompletedInvoice(invoice);
    setIsInvoiceModalOpen(true);
    setCart([]);
    setMobileCartOpen(false);
    loadProducts(); // refresh stock numbers
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 flex flex-col min-h-0">
        {/* Top Title Bar */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sales POS</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Point of Sale Register & Invoice Checkout</p>
          </div>

          {/* Cart summary badge on mobile */}
          <button
            type="button"
            onClick={() => setMobileCartOpen(!mobileCartOpen)}
            className="lg:hidden flex items-center gap-2 bg-green-600 dark:bg-green-500 text-white dark:text-black px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold shadow-md active:scale-95 transition-transform shrink-0"
            aria-label="View Cart"
          >
            <ShoppingCart size={18} />
            <span>{totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}</span>
            <span className="font-bold font-mono">{currencySymbol}{total.toLocaleString()}</span>
          </button>
        </div>

        {/* Search, Barcode Scanner & Category Filter */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by product name, SKU, or scan barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:border-green-500 shadow-sm transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white dark:bg-green-500 dark:text-black dark:hover:bg-green-400 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-green-600/20 active:scale-95 transition-all shrink-0"
              title="Scan Barcode with Camera"
            >
              <Camera size={18} />
              <span className="hidden sm:inline">Camera Scan</span>
            </button>
          </div>

          {/* Scanned Feedback Pill */}
          {lastScannedFeedback && (
            <div className="bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-400 text-xs px-3.5 py-2 rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
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
                    ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-black"
                    : "bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10"
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
              <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center text-slate-500 dark:text-gray-400 shadow-sm">
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
                      className={`relative bg-white dark:bg-white/5 border rounded-2xl p-3 text-left transition-all flex flex-col justify-between group shadow-sm ${
                        !inStock
                          ? "opacity-40 border-slate-200 dark:border-white/5 cursor-not-allowed"
                          : "border-slate-200 dark:border-white/10 hover:border-green-500 hover:shadow-md active:scale-97 cursor-pointer"
                      }`}
                    >
                      {itemInCart && (
                        <span className="absolute top-2 right-2 bg-green-600 text-white dark:bg-green-500 dark:text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                          {itemInCart.quantity}
                        </span>
                      )}

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wider block truncate">
                          {p.category || "General"}
                        </span>
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 leading-snug line-clamp-2">
                          {p.name}
                        </h2>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                          <span className="text-xs sm:text-sm font-extrabold text-green-600 dark:text-green-400 font-mono">
                            {currencySymbol}{Number(p.sell_price || 0).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            inStock ? "text-slate-500 dark:text-gray-400" : "text-red-500 dark:text-red-400"
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
            className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white dark:bg-gray-950 border-l border-slate-200 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between transition-transform duration-300 shadow-2xl lg:static lg:z-auto lg:w-full lg:col-span-5 xl:col-span-4 lg:rounded-3xl lg:border lg:bg-white dark:lg:bg-white/5 ${
              mobileCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
            }`}
          >
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMobileCart(false)}
                  className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-white/20 min-h-[44px] min-w-[44px] font-bold text-xs shrink-0"
                  aria-label="Back to Sales POS"
                  title="Back to Sales POS"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <ShoppingCart className="text-green-600 dark:text-green-500 w-5 h-5 hidden sm:block" />
                <h2 className="font-bold text-base text-slate-900 dark:text-white">Current Order</h2>
                <span className="text-xs bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
                  {totalItemsCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-red-500 hover:underline px-2 py-1"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleMobileCart(false)}
                  className="lg:hidden p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close cart drawer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Cart Line Items List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-[calc(100vh-320px)] lg:max-h-[380px] pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-gray-500 flex flex-col items-center justify-center gap-3">
                  <ShoppingCart size={36} className="opacity-30" />
                  <p className="text-xs font-semibold">Cart is empty. Tap products or scan barcode to add items.</p>
                  <button
                    type="button"
                    onClick={() => toggleMobileCart(false)}
                    className="lg:hidden mt-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold flex items-center gap-2 min-h-[44px]"
                    aria-label="Back to Sales POS"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Sales POS</span>
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                        {currencySymbol}{Number(item.sell_price || 0).toLocaleString()} × {item.quantity} ={" "}
                        <span className="text-green-600 dark:text-green-400 font-bold">
                          {currencySymbol}{(Number(item.sell_price || 0) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Minus size={12} />
                      </button>

                      <span className="w-6 text-center text-xs font-bold font-mono text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Plus size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 flex items-center justify-center ml-1"
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
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex justify-between items-center text-sm text-slate-500 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-mono">{currencySymbol}{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-green-600 dark:text-green-400 font-mono">{currencySymbol}{total.toLocaleString()}</span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleOpenCheckout}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                  cart.length > 0
                    ? "bg-green-600 text-white hover:bg-green-500 dark:bg-green-500 dark:text-black dark:hover:bg-green-400 cursor-pointer active:scale-98 shadow-lg shadow-green-600/20"
                    : "bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-gray-500 cursor-not-allowed"
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
          onClose={handleCloseCheckout}
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
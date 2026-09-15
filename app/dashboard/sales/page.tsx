"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle2, ArrowRight } from "lucide-react";

export default function SalesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    loadProducts();
  }, []);

  function addToCart(product: any) {
    if (Number(product.stock) <= 0) {
      alert("Product is out of stock!");
      return;
    }

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      if (existing.quantity >= Number(product.stock)) {
        alert(`Cannot add more than available stock (${product.stock})`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
        },
      ]);
    }
  }

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

  async function handleCheckout() {
    if (cart.length === 0) {
      alert("Cart is empty! Please add products before checking out.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/sales/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, total }),
      });

      const data = await res.json();

      if (data.success) {
        const invoiceNo = data.invoice_no;
        const cartSnapshot = encodeURIComponent(JSON.stringify(cart));
        setCart([]);
        setMobileCartOpen(false);
        router.push(`/dashboard/invoice?invoice=${invoiceNo}&total=${total}&items=${cartSnapshot}`);
      } else {
        alert(data.message || "Failed to complete sale");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Checkout error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 flex flex-col min-h-0">
        {/* Top Title Bar */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 pb-3 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sales POS</h1>
            <p className="text-xs sm:text-sm text-gray-400">Point of Sale Register & Checkout</p>
          </div>

          {/* Cart summary badge on mobile */}
          <button
            type="button"
            onClick={() => setMobileCartOpen(!mobileCartOpen)}
            className="lg:hidden flex items-center gap-2 bg-green-500 text-black px-3.5 py-2 rounded-xl text-sm font-semibold shadow-lg active:scale-95 transition-transform"
          >
            <ShoppingCart size={18} />
            <span>{totalItemsCount}</span>
            <span className="font-bold">৳{total.toLocaleString()}</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-3 mb-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by product name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                  selectedCategory === cat
                    ? "bg-green-500 text-black font-semibold"
                    : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main 2-Column POS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start flex-1">
          {/* Left: Product Grid (Cols 1-7 on desktop) */}
          <div className="lg:col-span-7 xl:col-span-8">
            {filteredProducts.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-400">
                No products found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const inStock = Number(product.stock) > 0;
                  const inCart = cart.find((item) => item.id === product.id);

                  return (
                    <div
                      key={product.id}
                      onClick={() => inStock && addToCart(product)}
                      className={`relative bg-white/5 border rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all select-none ${
                        inStock
                          ? "hover:border-green-500/80 hover:bg-white/10 cursor-pointer active:scale-[0.98] border-white/10"
                          : "opacity-50 cursor-not-allowed border-red-500/20"
                      } ${inCart ? "ring-2 ring-green-500/50 border-green-500" : ""}`}
                    >
                      {inCart && (
                        <div className="absolute top-2 right-2 bg-green-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {inCart.quantity} in cart
                        </div>
                      )}

                      <div>
                        <h3 className="font-semibold text-sm sm:text-base text-white line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">
                          {product.category || "General"}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-green-400">
                          ৳{Number(product.sell_price || 0).toLocaleString()}
                        </span>
                        <span
                          className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium ${
                            inStock ? "bg-white/10 text-gray-300" : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {inStock ? `Qty ${product.stock}` : "Out"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Cart Panel (Desktop Sticky / Mobile Sheet) */}
          <div
            className={`lg:col-span-5 xl:col-span-4 bg-gray-950 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between lg:sticky lg:top-8 ${
              mobileCartOpen ? "block" : "hidden lg:flex"
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-green-500 w-5 h-5" />
                  <h2 className="text-lg font-bold">Cart Items ({totalItemsCount})</h2>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  Cart is empty. Tap any product to add it.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-xs sm:text-sm text-white truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs text-green-400 mt-0.5">
                          ৳{item.sell_price} $\times$ {item.quantity} ={" "}
                          <span className="font-bold">
                            ৳{(item.sell_price * item.quantity).toLocaleString()}
                          </span>
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-95"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-500/20 flex items-center justify-center ml-1"
                          aria-label="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary & Checkout */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>Subtotal</span>
                <span>৳{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg sm:text-xl font-bold text-white">
                <span>Total Amount</span>
                <span className="text-green-400">৳{total.toLocaleString()}</span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleCheckout}
                className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                  cart.length > 0 && !isSubmitting
                    ? "bg-green-500 text-black hover:bg-green-400 cursor-pointer active:scale-98 shadow-lg shadow-green-500/20"
                    : "bg-white/10 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Complete Sale (৳{total.toLocaleString()})</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
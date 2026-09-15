"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Package,
  Search,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Barcode,
  Printer,
  Upload,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
} from "lucide-react";
import { generateStoreBarcode } from "@/lib/barcode-engine";
import BarcodeLabelModal, { LabelProductItem } from "@/components/BarcodeLabelModal";
import BulkImportModal from "@/components/BulkImportModal";
import StockAdjustmentModal, { StockAdjustProduct } from "@/components/StockAdjustmentModal";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("");

  // Modals state
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelProducts, setLabelProducts] = useState<LabelProductItem[]>([]);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<StockAdjustProduct | null>(null);

  // Multi-select for bulk actions
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

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

  function handleAutoGenerateBarcode() {
    const generated = generateStoreBarcode("AP");
    setBarcode(generated);
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Product name is required");
      return;
    }

    const finalBarcode = barcode.trim() || generateStoreBarcode("AP");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          barcode: finalBarcode,
          category,
          buy_price: buyPrice,
          sell_price: sellPrice,
          stock,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message || "Product Saved Successfully!");
        setName("");
        setBarcode("");
        setCategory("");
        setBuyPrice("");
        setSellPrice("");
        setStock("");
        setSuggestions([]);
        setIsAdding(false);
        loadProducts();
      } else {
        alert(data.message || "Failed to add product");
      }
    } catch (err) {
      console.error("Error adding product:", err);
      alert("Error adding product");
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch("/api/products/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        loadProducts();
      } else {
        alert(data.message || "Failed to delete product");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  }

  async function updateProduct(product: any) {
    try {
      const res = await fetch("/api/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      const data = await res.json();
      if (data.success) {
        alert("Product updated successfully!");
        loadProducts();
      } else {
        alert(data.message || "Failed to update product");
      }
    } catch (err) {
      console.error("Error updating product:", err);
    }
  }

  function toggleSelectProduct(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    }
  }

  function openPrintForSingle(product: any) {
    setLabelProducts([
      {
        id: product.id,
        name: product.name,
        barcode: product.barcode || generateStoreBarcode("AP"),
        sell_price: Number(product.sell_price) || 0,
        stock: Number(product.stock) || 1,
        copies: 1,
      },
    ]);
    setIsLabelModalOpen(true);
  }

  function openPrintForSelected() {
    const selected = products.filter((p) => selectedProductIds.has(p.id));
    if (selected.length === 0) return;

    setLabelProducts(
      selected.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode || generateStoreBarcode("AP"),
        sell_price: Number(p.sell_price) || 0,
        stock: Number(p.stock) || 1,
        copies: 1,
      }))
    );
    setIsLabelModalOpen(true);
  }

  const existingBarcodeSet = new Set<string>(products.map((p) => p.barcode).filter(Boolean));

  const filteredProducts = products.filter((p) =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Products</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
              Catalog management, barcode generation, inventory levels & bulk import
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Upload size={16} />
              <span>Bulk Import CSV</span>
            </button>

            {selectedProductIds.size > 0 && (
              <button
                type="button"
                onClick={openPrintForSelected}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all animate-pulse"
              >
                <Printer size={16} />
                <span>Print Labels ({selectedProductIds.size})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 bg-green-600 dark:bg-green-500 text-white dark:text-black px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-green-500 dark:hover:bg-green-400 transition-colors shadow-md active:scale-95"
            >
              <Plus size={18} />
              <span>{isAdding ? "Close Form" : "Add Product"}</span>
            </button>
          </div>
        </div>

        {/* Add Product Collapsible Form */}
        {isAdding && (
          <form
            onSubmit={addProduct}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 sm:p-6 rounded-2xl mb-8 space-y-4 max-w-3xl shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Package className="text-green-600 dark:text-green-500 w-5 h-5" />
              <span>New Product Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name with Suggestions */}
              <div className="sm:col-span-2 relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400 mb-1">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Wireless Noise Canceling Headphones"
                  value={name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setName(value);
                    if (value.length > 1) {
                      setSuggestions(
                        products.filter((p) => p.name.toLowerCase().includes(value.toLowerCase()))
                      );
                    } else {
                      setSuggestions([]);
                    }
                  }}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                  required
                />

                {suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                    {suggestions.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setName(item.name);
                          setBarcode(item.barcode || "");
                          setBuyPrice(item.buy_price || "");
                          setSellPrice(item.sell_price || "");
                          setCategory(item.category || "");
                          setSuggestions([]);
                        }}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer text-sm text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border-b border-slate-100 dark:border-white/5"
                      >
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-xs text-slate-500 dark:text-gray-400 ml-2">({item.category || "General"})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Barcode with Auto-Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400">Barcode / SKU</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateBarcode}
                    className="text-[11px] text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles size={12} /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter or generate barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full p-3 pr-10 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:border-green-500"
                  />
                  <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Electronics, Fashion, Watches"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Buy Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400 mb-1">Cost / Buy Price (৳)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Sell Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400 mb-1">Selling Price (৳) *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* Initial Stock */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400 mb-1">Initial Stock Qty</label>
                <input
                  type="number"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-500 dark:bg-green-500 dark:hover:bg-green-400 text-white dark:text-black py-3 rounded-xl font-bold transition-colors shadow-md"
            >
              Save Product
            </button>
          </form>
        )}

        {/* Search & Bulk Selection Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products by name, barcode, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:border-green-500 shadow-sm"
            />
          </div>

          {filteredProducts.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0 shadow-sm"
            >
              {selectedProductIds.size === filteredProducts.length ? (
                <CheckSquare size={16} className="text-green-600 dark:text-green-400" />
              ) : (
                <Square size={16} />
              )}
              <span>Select All ({filteredProducts.length})</span>
            </button>
          )}
        </div>

        {/* Product List Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center text-slate-500 dark:text-gray-400 shadow-sm">
            No products found matching &quot;{search}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const isSelected = selectedProductIds.has(product.id);
              return (
                <div
                  key={product.id}
                  className={`bg-white dark:bg-white/5 border p-4 sm:p-5 rounded-2xl transition-all flex flex-col justify-between relative shadow-sm ${
                    isSelected
                      ? "border-green-500 bg-green-50 dark:bg-green-500/10 shadow-md"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  {/* Select Checkbox & Barcode Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectProduct(product.id)}
                      className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      title="Select for bulk actions"
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-green-400" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openPrintForSingle(product)}
                      className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                      title="Print Barcode Label"
                    >
                      <Printer size={12} className="text-green-400" />
                      <span className="truncate max-w-[120px]">{product.barcode || "No Barcode"}</span>
                    </button>
                  </div>

                  <div>
                    <input
                      value={product.name}
                      onChange={(e) => {
                        const updated = [...products];
                        const index = updated.findIndex((p) => p.id === product.id);
                        updated[index] = { ...updated[index], name: e.target.value };
                        setProducts(updated);
                      }}
                      className="bg-black/40 border border-white/10 p-2 rounded-lg w-full text-sm font-bold text-white focus:outline-none focus:border-green-500"
                    />

                    <div className="mt-3 space-y-1.5 text-xs text-gray-400">
                      <p>
                        <span className="text-gray-500 font-medium">Category:</span>{" "}
                        {product.category || "General"}
                      </p>
                      <p>
                        <span className="text-gray-500 font-medium">Sell Price:</span>{" "}
                        <span className="font-bold text-green-400">
                          ৳{Number(product.sell_price || 0).toLocaleString()}
                        </span>
                      </p>
                      <div className="flex items-center justify-between">
                        <p>
                          <span className="text-gray-500 font-medium">Stock:</span>{" "}
                          <span className="font-bold text-white">{product.stock || 0}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStockProduct({
                              id: product.id,
                              name: product.name,
                              barcode: product.barcode || "",
                              stock: Number(product.stock) || 0,
                            })
                          }
                          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold underline"
                        >
                          <Layers size={12} /> Adjust
                        </button>
                      </div>
                    </div>

                    {Number(product.stock) <= 5 && (
                      <div className="flex items-center gap-1 text-amber-400 text-xs mt-2.5 font-medium">
                        <AlertTriangle size={14} />
                        <span>Low Stock Warning</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => deleteProduct(product.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white py-2 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateProduct(product)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white py-2 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Save size={14} />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Barcode Label Printing Modal */}
        <BarcodeLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          products={labelProducts}
          storeName="Autopilot POS"
          currencySymbol="৳"
        />

        {/* Bulk Product CSV Import Modal */}
        <BulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={() => {
            loadProducts();
          }}
          existingBarcodes={existingBarcodeSet}
        />

        {/* Auditable Stock Adjustment Modal */}
        <StockAdjustmentModal
          isOpen={Boolean(selectedStockProduct)}
          onClose={() => setSelectedStockProduct(null)}
          onSuccess={() => {
            loadProducts();
          }}
          product={selectedStockProduct}
        />
      </main>
    </div>
  );
}
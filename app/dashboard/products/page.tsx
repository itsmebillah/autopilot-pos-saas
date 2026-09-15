"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  Package,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Barcode,
  Printer,
  Upload,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Calculator,
  Edit3,
  X,
} from "lucide-react";
import { generateStoreBarcode } from "@/lib/barcode-engine";
import BarcodeLabelModal, { LabelProductItem } from "@/components/BarcodeLabelModal";
import BulkImportModal from "@/components/BulkImportModal";
import StockAdjustmentModal, { StockAdjustProduct } from "@/components/StockAdjustmentModal";
import {
  resolveProductCost,
  calculateBulkAllocation,
  sumCostBreakdown,
  CostBreakdown,
} from "@/lib/product-costing";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("");

  // Detailed Cost Breakdown States
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({
    packaging: 0,
    transport: 0,
    handling: 0,
    customization: 0,
    other: 0,
  });

  // Bulk Allocation Calculator State
  const [showBulkAlloc, setShowBulkAlloc] = useState(false);
  const [bulkBatchQty, setBulkBatchQty] = useState("");
  const [bulkBatchCost, setBulkBatchCost] = useState("");

  // Modals state
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelProducts, setLabelProducts] = useState<LabelProductItem[]>([]);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<StockAdjustProduct | null>(null);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editShowBreakdown, setEditShowBreakdown] = useState(false);

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

  // Handle breakdown changes in Add Form
  function handleBreakdownChange(key: keyof CostBreakdown, value: string) {
    const num = parseFloat(value) || 0;
    const nextBreakdown = { ...costBreakdown, [key]: num };
    setCostBreakdown(nextBreakdown);
    const sum = sumCostBreakdown(nextBreakdown);
    setAdditionalCost(sum > 0 ? String(sum) : "");
  }

  // Handle bulk allocation in Add Form
  function applyBulkAllocation() {
    const qty = parseFloat(bulkBatchQty) || 0;
    const batchCost = parseFloat(bulkBatchCost) || 0;
    if (qty <= 0 || batchCost <= 0) {
      alert("Please enter a valid batch quantity and total additional cost.");
      return;
    }
    const res = calculateBulkAllocation({
      quantity: qty,
      purchaseCostPerUnit: parseFloat(purchaseCost) || 0,
      totalBatchAdditionalCost: batchCost,
    });
    setAdditionalCost(String(res.allocatedAdditionalCostPerUnit));
    if (stock === "" || stock === "0") {
      setStock(String(qty));
    }
    alert(`Allocated ৳${res.allocatedAdditionalCostPerUnit} additional cost per unit across ${qty} units.`);
  }

  // Live Cost Resolution for Add Form
  const currentCostResolution = resolveProductCost({
    purchase_cost: purchaseCost,
    additional_cost: additionalCost,
    cost_breakdown: costBreakdown,
    sell_price: sellPrice,
  });

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
          purchase_cost: currentCostResolution.purchaseCost,
          additional_cost: currentCostResolution.additionalCost,
          cost_breakdown: costBreakdown,
          buy_price: currentCostResolution.landedCost, // Canonical Landed Cost
          sell_price: currentCostResolution.sellPrice,
          stock,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message || "Product Saved Successfully! 🚀");
        setName("");
        setBarcode("");
        setCategory("");
        setPurchaseCost("");
        setAdditionalCost("");
        setSellPrice("");
        setStock("");
        setCostBreakdown({
          packaging: 0,
          transport: 0,
          handling: 0,
          customization: 0,
          other: 0,
        });
        setShowBreakdown(false);
        setShowBulkAlloc(false);
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

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;

    const resolved = resolveProductCost({
      purchase_cost: editingProduct.purchase_cost,
      additional_cost: editingProduct.additional_cost,
      cost_breakdown: editingProduct.cost_breakdown,
      buy_price: editingProduct.buy_price,
      sell_price: editingProduct.sell_price,
    });

    try {
      const res = await fetch("/api/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct.id,
          name: editingProduct.name,
          barcode: editingProduct.barcode,
          category: editingProduct.category,
          purchase_cost: resolved.purchaseCost,
          additional_cost: resolved.additionalCost,
          cost_breakdown: editingProduct.cost_breakdown,
          buy_price: resolved.landedCost,
          sell_price: resolved.sellPrice,
          stock: editingProduct.stock,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Product updated successfully! ✨");
        setEditingProduct(null);
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
              Catalog management, landed cost structure, barcode generation & inventory levels
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
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 sm:p-6 rounded-2xl mb-8 space-y-5 max-w-4xl shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="text-green-600 dark:text-green-500 w-5 h-5" />
                <span>New Product Details & Landed Cost Structure</span>
              </h2>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Product Name */}
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
                          setPurchaseCost(String(item.purchase_cost || item.buy_price || ""));
                          setAdditionalCost(String(item.additional_cost || ""));
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

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Electronics, Fashion, Shoes"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Barcode */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400">Barcode / SKU</label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateBarcode}
                    className="text-[11px] text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles size={12} /> Auto-Generate Unique
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter manufacturer barcode or auto-generate"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full p-3 pr-10 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:border-green-500"
                  />
                  <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              {/* Initial Stock */}
              <div>
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

            {/* Product Cost Structure Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Product Cost Structure (Unit Level)
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBulkAlloc(!showBulkAlloc)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Calculator size={13} />
                    <span>{showBulkAlloc ? "Hide Bulk Allocator" : "Bulk Batch Allocator"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="text-xs text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-semibold"
                  >
                    {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showBreakdown ? "Hide Breakdown" : "Cost Breakdown"}</span>
                  </button>
                </div>
              </div>

              {/* Bulk Batch Allocator Sub-panel */}
              {showBulkAlloc && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">Batch Total Quantity</label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={bulkBatchQty}
                      onChange={(e) => setBulkBatchQty(e.target.value)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-black/50 border border-blue-300 dark:border-blue-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">Batch Total Additional Cost</label>
                    <input
                      type="number"
                      placeholder="e.g. 800 (freight, box...)"
                      value={bulkBatchCost}
                      onChange={(e) => setBulkBatchCost(e.target.value)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-black/50 border border-blue-300 dark:border-blue-600 text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={applyBulkAllocation}
                      className="w-full p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
                    >
                      Allocate Per Unit
                    </button>
                  </div>
                </div>
              )}

              {/* Cost Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Purchase Cost */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Purchase Cost (Supplier Price)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 block">Actual invoice paid to supplier</span>
                </div>

                {/* Additional Cost */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Additional Cost (Packaging, Freight)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={additionalCost}
                    onChange={(e) => setAdditionalCost(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 block">Box, transport, handling per unit</span>
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                    Selling Price (Retail) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-green-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 block">POS sales price</span>
                </div>
              </div>

              {/* Expandable Breakdown Details */}
              {showBreakdown && (
                <div className="p-4 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">Packaging / Box</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={costBreakdown.packaging || ""}
                      onChange={(e) => handleBreakdownChange("packaging", e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-gray-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">Transport / Freight</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={costBreakdown.transport || ""}
                      onChange={(e) => handleBreakdownChange("transport", e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-gray-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">Handling / Labor</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={costBreakdown.handling || ""}
                      onChange={(e) => handleBreakdownChange("handling", e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-gray-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">Other / Custom</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={costBreakdown.other || ""}
                      onChange={(e) => handleBreakdownChange("other", e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-gray-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Live Landed Cost & Profit Calculation Summary Card */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 dark:text-gray-400 block font-medium">Automatic Total / Landed Cost:</span>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-slate-800 dark:text-gray-200">
                      Purchase: ৳{currentCostResolution.purchaseCost.toLocaleString()}
                    </span>
                    <span className="text-slate-400">+</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      Additional: ৳{currentCostResolution.additionalCost.toLocaleString()}
                    </span>
                    <span className="text-slate-400">=</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30">
                      Total Cost: ৳{currentCostResolution.landedCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 dark:text-gray-400 block">Gross Profit</span>
                    <span className={`text-base font-bold ${currentCostResolution.grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      ৳{currentCostResolution.grossProfit.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right border-l border-slate-300 dark:border-white/10 pl-3">
                    <span className="text-[11px] text-slate-500 dark:text-gray-400 block">Margin %</span>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                      {currentCostResolution.grossMarginPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-500 dark:bg-green-500 dark:hover:bg-green-400 text-white dark:text-black py-3 rounded-xl font-bold transition-colors shadow-md cursor-pointer"
            >
              Save Product & Landed Cost
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
              const costRes = resolveProductCost({
                purchase_cost: product.purchase_cost,
                additional_cost: product.additional_cost,
                cost_breakdown: product.cost_breakdown,
                buy_price: product.buy_price,
                sell_price: product.sell_price,
              });

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
                        <CheckSquare size={18} className="text-green-500" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => openPrintForSingle(product)}
                      className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 transition-colors"
                      title="Print Barcode Label"
                    >
                      <Printer size={12} className="text-green-600 dark:text-green-400" />
                      <span className="truncate max-w-[120px]">{product.barcode || "No Barcode"}</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight truncate">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                      {product.category || "General"}
                    </p>

                    {/* Cost Structure Pill Box */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-gray-400">Landed Cost:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ৳{costRes.landedCost.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-gray-500">
                        <span>(Purchase: ৳{costRes.purchaseCost} + Add: ৳{costRes.additionalCost})</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/5">
                        <span className="text-slate-500 dark:text-gray-400">Selling Price:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          ৳{costRes.sellPrice.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/5">
                        <span className="text-slate-500 dark:text-gray-400">Gross Profit:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-300">
                          ৳{costRes.grossProfit.toLocaleString()} ({costRes.grossMarginPercentage}%)
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                      <p>
                        <span>Stock:</span>{" "}
                        <span className="font-bold text-slate-900 dark:text-white">{product.stock || 0}</span>
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
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Layers size={12} /> Adjust
                      </button>
                    </div>

                    {Number(product.stock) <= 5 && (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs mt-2 font-medium">
                        <AlertTriangle size={14} />
                        <span>Low Stock Warning</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => deleteProduct(product.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 py-2 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct({
                          ...product,
                          purchase_cost: product.purchase_cost ?? product.buy_price,
                          additional_cost: product.additional_cost ?? 0,
                          cost_breakdown: product.cost_breakdown || {},
                        });
                        setEditShowBreakdown(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 py-2 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Edit3 size={13} />
                      <span>Edit Cost</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Product & Cost Structure Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-500" />
                  <span>Edit Product & Cost Structure</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Product Name</label>
                    <input
                      type="text"
                      value={editingProduct.name || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Barcode</label>
                    <input
                      type="text"
                      value={editingProduct.barcode || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={editingProduct.category || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-sm"
                    />
                  </div>

                  {/* Cost Fields */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Purchase Cost (Supplier)</label>
                    <input
                      type="number"
                      step="any"
                      value={editingProduct.purchase_cost ?? ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, purchase_cost: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">Additional Cost</label>
                      <button
                        type="button"
                        onClick={() => setEditShowBreakdown(!editShowBreakdown)}
                        className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        {editShowBreakdown ? "Hide Breakdown" : "Edit Breakdown"}
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={editingProduct.additional_cost ?? ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, additional_cost: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-sm"
                    />
                  </div>

                  {editShowBreakdown && (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Box / Pkg</label>
                        <input
                          type="number"
                          step="any"
                          value={editingProduct.cost_breakdown?.packaging || ""}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value) || 0;
                            const nextBd = { ...(editingProduct.cost_breakdown || {}), packaging: num };
                            const sum = sumCostBreakdown(nextBd);
                            setEditingProduct({
                              ...editingProduct,
                              cost_breakdown: nextBd,
                              additional_cost: sum > 0 ? String(sum) : "",
                            });
                          }}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-gray-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Transport</label>
                        <input
                          type="number"
                          step="any"
                          value={editingProduct.cost_breakdown?.transport || ""}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value) || 0;
                            const nextBd = { ...(editingProduct.cost_breakdown || {}), transport: num };
                            const sum = sumCostBreakdown(nextBd);
                            setEditingProduct({
                              ...editingProduct,
                              cost_breakdown: nextBd,
                              additional_cost: sum > 0 ? String(sum) : "",
                            });
                          }}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-gray-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Handling</label>
                        <input
                          type="number"
                          step="any"
                          value={editingProduct.cost_breakdown?.handling || ""}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value) || 0;
                            const nextBd = { ...(editingProduct.cost_breakdown || {}), handling: num };
                            const sum = sumCostBreakdown(nextBd);
                            setEditingProduct({
                              ...editingProduct,
                              cost_breakdown: nextBd,
                              additional_cost: sum > 0 ? String(sum) : "",
                            });
                          }}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-gray-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Other</label>
                        <input
                          type="number"
                          step="any"
                          value={editingProduct.cost_breakdown?.other || ""}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value) || 0;
                            const nextBd = { ...(editingProduct.cost_breakdown || {}), other: num };
                            const sum = sumCostBreakdown(nextBd);
                            setEditingProduct({
                              ...editingProduct,
                              cost_breakdown: nextBd,
                              additional_cost: sum > 0 ? String(sum) : "",
                            });
                          }}
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-gray-700 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Selling Price *</label>
                    <input
                      type="number"
                      step="any"
                      value={editingProduct.sell_price || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sell_price: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      value={editingProduct.stock || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>

                {/* Edit Modal Live Cost Preview */}
                {(() => {
                  const editRes = resolveProductCost({
                    purchase_cost: editingProduct.purchase_cost,
                    additional_cost: editingProduct.additional_cost,
                    cost_breakdown: editingProduct.cost_breakdown,
                    sell_price: editingProduct.sell_price,
                  });
                  return (
                    <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-gray-400 block font-medium">Computed Landed Cost:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                          ৳{editRes.landedCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 dark:text-gray-400 block font-medium">Gross Profit:</span>
                        <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                          ৳{editRes.grossProfit.toLocaleString()} ({editRes.grossMarginPercentage}%)
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-semibold text-slate-700 dark:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
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
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Package, Search, Plus, Trash2, Save, AlertTriangle } from "lucide-react";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("");

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

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Product name is required");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          barcode,
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

  const filteredProducts = products.filter((p) =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Products</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Catalog management, inventory levels & stock updates
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="self-start sm:self-auto flex items-center gap-2 bg-green-500 text-black px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-400 transition-colors shadow-lg active:scale-95"
          >
            <Plus size={18} />
            <span>{isAdding ? "Close Form" : "Add Product"}</span>
          </button>
        </div>

        {/* Add Product Collapsible Form */}
        {isAdding && (
          <form
            onSubmit={addProduct}
            className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl mb-8 space-y-4 max-w-3xl"
          >
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Package className="text-green-500 w-5 h-5" />
              <span>New Product Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name with Suggestions */}
              <div className="sm:col-span-2 relative">
                <label className="block text-xs font-medium text-gray-400 mb-1">Product Name *</label>
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
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                  required
                />

                {suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
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
                        className="p-3 hover:bg-white/10 cursor-pointer text-sm text-gray-300 hover:text-white border-b border-white/5"
                      >
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({item.category || "General"})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Barcode / SKU</label>
                <input
                  type="text"
                  placeholder="e.g. 890123456789"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Electronics, Fashion"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Buy Price */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cost Price (৳)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Sell Price */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Selling Price (৳) *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                  required
                />
              </div>

              {/* Initial Stock */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Initial Stock Qty</label>
                <input
                  type="number"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-500 text-black py-3 rounded-xl font-bold hover:bg-green-400 transition-colors shadow-lg"
            >
              Save Product
            </button>
          </form>
        )}

        {/* Search Filter Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search products by name, barcode, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Product List Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-gray-400">
            No products found matching &quot;{search}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl hover:border-white/20 transition-all flex flex-col justify-between"
              >
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
                      <span className="text-gray-500 font-medium">Barcode:</span> {product.barcode || "N/A"}
                    </p>
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
                    <p>
                      <span className="text-gray-500 font-medium">Stock:</span>{" "}
                      <span className="font-bold text-white">{product.stock || 0}</span>
                    </p>
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
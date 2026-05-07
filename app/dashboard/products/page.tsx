"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function ProductsPage() {

  const [products, setProducts] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("");

  async function loadProducts() {

    const res = await fetch("/api/products/list");

    const data = await res.json();

    if (data.success) {
      setProducts(data.products);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function addProduct(e: React.FormEvent) {

    e.preventDefault();

    const res = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        barcode,
        buy_price: buyPrice,
        sell_price: sellPrice,
        stock,
      }),
    });

    const data = await res.json();

    if (data.success) {

      alert("Product Added 🚀");

      setName("");
      setBarcode("");
      setBuyPrice("");
      setSellPrice("");
      setStock("");

      loadProducts();

    } else {
      alert(data.message);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex">
        <Sidebar />
<div className="flex-1 p-8">
      <h1 className="text-4xl font-bold mb-8">
        Products
      </h1>

      <form
        onSubmit={addProduct}
        className="bg-white/10 p-6 rounded-2xl space-y-5 max-w-xl"
      >

        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
        />

        <input
          type="text"
          placeholder="Barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
        />

        <input
          type="number"
          placeholder="Buy Price"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
          className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
        />

        <input
          type="number"
          placeholder="Sell Price"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
        />

        <input
          type="number"
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
        />

        <button
          type="submit"
          className="bg-green-500 px-5 py-3 rounded-xl w-full"
        >
          Add Product
        </button>

      </form>

      <div className="mt-10 space-y-4">

        {products.map((product) => (

          <div
            key={product.id}
            className="bg-white/10 p-5 rounded-2xl"
          >

            <h2 className="text-xl font-bold">
              {product.name}
            </h2>

            <p className="text-gray-400">
              Barcode: {product.barcode}
            </p>

            <p>
              Sell Price: ৳ {product.sell_price}
            </p>

            <p>
              Stock: {product.stock}
              <button
  onClick={async () => {

    const res = await fetch("/api/products/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: product.id,
      }),
    });

    const data = await res.json();

    if (data.success) {
      loadProducts();
    }

  }}
  className="mt-4 bg-red-500 px-4 py-2 rounded-xl"
>
  Delete
</button>
            </p>

          </div>

        ))}

      </div>
</div>

    </main>
  );
}
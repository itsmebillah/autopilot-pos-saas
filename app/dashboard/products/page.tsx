"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function ProductsPage() {

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [suggestions, setSuggestions] =
    useState<any[]>([]);

  const [category, setCategory] = useState("");
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

  async function addProduct(
    e: React.FormEvent
  ) {

    e.preventDefault();

    const res = await fetch(
      "/api/products",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          name,
          barcode,
          category,
          buy_price: buyPrice,
          sell_price: sellPrice,
          stock,
        }),
      }
    );

    const data = await res.json();

    if (data.success) {

      alert(
        data.message || "Product Added 🚀"
      );

      setName("");
      setBarcode("");
      setCategory("");
      setBuyPrice("");
      setSellPrice("");
      setStock("");

      setSuggestions([]);

      loadProducts();

    } else {

      alert(data.message);

    }

  }

  return (
    <main className="min-h-screen bg-black text-white flex">

      <Sidebar />

      <div className="flex-1 p-8">

        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full max-w-md p-3 rounded-xl bg-white/10 border border-white/10 mb-8"
        />

        <h1 className="text-4xl font-bold mb-8">
          Products
        </h1>

        <form
          onSubmit={addProduct}
          className="bg-white/10 p-6 rounded-2xl space-y-5 max-w-xl"
        >

          {/* Product Name */}
          <input
            type="text"
            placeholder="Product Name"
            value={name}
            onChange={(e) => {

              const value =
                e.target.value;

              setName(value);

              if (value.length > 0) {

                const matched =
                  products.filter(
                    (product) =>
                      product.name
                        .toLowerCase()
                        .includes(
                          value.toLowerCase()
                        )
                  );

                setSuggestions(
                  matched
                );

              } else {

                setSuggestions([]);

              }

            }}
            className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
          />

          {/* Suggestions */}
          {suggestions.length > 0 && (

            <div className="bg-black border border-white/10 rounded-xl overflow-hidden">

              {suggestions.map(
                (item) => (

                  <div
                    key={item.id}
                    onClick={() => {

                      setName(
                        item.name
                      );

                      setBarcode(
                        item.barcode
                      );

                      setBuyPrice(
                        item.buy_price
                      );

                      setSellPrice(
                        item.sell_price
                      );

                      setCategory(
                        item.category ||
                          ""
                      );

                      setSuggestions(
                        []
                      );

                    }}
                    className="p-3 hover:bg-white/10 cursor-pointer"
                  >

                    {item.name}

                  </div>

                )
              )}

            </div>

          )}

          {/* Barcode */}
          <input
            type="text"
            placeholder="Barcode"
            value={barcode}
            onChange={(e) =>
              setBarcode(
                e.target.value
              )
            }
            className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
          />

          {/* Category */}
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
            className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
          />

          {/* Buy Price */}
          <input
            type="number"
            placeholder="Buy Price"
            value={buyPrice}
            onChange={(e) =>
              setBuyPrice(
                e.target.value
              )
            }
            className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
          />

          {/* Sell Price */}
          <input
            type="number"
            placeholder="Sell Price"
            value={sellPrice}
            onChange={(e) =>
              setSellPrice(
                e.target.value
              )
            }
            className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
          />

          {/* Stock */}
          <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) =>
              setStock(
                e.target.value
              )
            }
            className="w-full p-3 rounded-xl bg-black/40 border border-gray-700"
          />

          <button
            type="submit"
            className="bg-green-500 px-5 py-3 rounded-xl w-full"
          >
            Add Product
          </button>

        </form>

        {/* Product List */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {products
            .filter((product) =>
              product.name
                .toLowerCase()
                .includes(
                  search.toLowerCase()
                )
            )
            .map((product) => (

              <div
                key={product.id}
                className="bg-white/10 border border-white/10 p-5 rounded-2xl hover:border-green-500 transition-all"
              >

                <input
                  value={product.name}
                  onChange={(e) => {

                    const updated =
                      [...products];

                    const index =
                      updated.findIndex(
                        (p) =>
                          p.id ===
                          product.id
                      );

                    updated[
                      index
                    ].name =
                      e.target.value;

                    setProducts(
                      updated
                    );

                  }}
                  className="bg-black/30 p-2 rounded-lg w-full"
                />

                <p className="text-gray-400 mt-3">
                  Barcode:
                  {" "}
                  {product.barcode}
                </p>

                <p className="text-gray-400">
                  Category:
                  {" "}
                  {product.category ||
                    "N/A"}
                </p>

                <p className="mt-2">
                  Sell Price:
                  {" "}
                  ৳
                  {" "}
                  {product.sell_price}
                </p>

                <p className="mt-2">
                  Stock:
                  {" "}
                  {product.stock}
                </p>

                {product.stock <= 5 && (

                  <p className="text-red-400 mt-2">
                    ⚠ Low Stock
                  </p>

                )}

                <div className="flex gap-3 mt-5">

                  <button
                    onClick={async () => {

                      const res =
                        await fetch(
                          "/api/products/delete",
                          {
                            method:
                              "POST",
                            headers: {
                              "Content-Type":
                                "application/json",
                            },
                            body:
                              JSON.stringify(
                                {
                                  id: product.id,
                                }
                              ),
                          }
                        );

                      const data =
                        await res.json();

                      if (
                        data.success
                      ) {

                        loadProducts();

                      }

                    }}
                    className="bg-red-500 px-4 py-2 rounded-xl"
                  >
                    Delete
                  </button>

                  <button
                    onClick={async () => {

                      const res =
                        await fetch(
                          "/api/products/update",
                          {
                            method:
                              "POST",
                            headers: {
                              "Content-Type":
                                "application/json",
                            },
                            body:
                              JSON.stringify(
                                product
                              ),
                          }
                        );

                      const data =
                        await res.json();

                      if (
                        data.success
                      ) {

                        alert(
                          "Updated 🚀"
                        );

                      }

                    }}
                    className="bg-blue-500 px-4 py-2 rounded-xl"
                  >
                    Save
                  </button>

                </div>

              </div>

            ))}

        </div>

      </div>

    </main>
  );
}
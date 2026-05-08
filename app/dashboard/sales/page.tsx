"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

export default function SalesPage() {

  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
const router = useRouter();
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

  function addToCart(product: any) {

    if (product.stock <= 0) {

  alert("Out of Stock ❌");

  return;
}
    const existing = cart.find(
      (item) => item.id === product.id
    );

    if (existing) {

      const updated = cart.map((item) =>
        item.id === product.id
          ? {
              ...item,
              quantity:
  item.quantity + 1 > item.stock
    ? item.stock
    : item.quantity + 1,
            }
          : item
      );

      setCart(updated);

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

  const total = cart.reduce(
    (sum, item) =>
      sum + item.sell_price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-black text-white flex">

      <Sidebar />

      <div className="flex-1 p-8">

        <div className="flex items-center justify-between mb-8">

          <div>
            <h1 className="text-4xl font-bold">
              Sales POS
            </h1>

            <p className="text-gray-400 mt-2">
              Create new sale
            </p>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Products */}
          <div className="lg:col-span-2 bg-white/10 rounded-2xl p-5">

            <h2 className="text-2xl font-bold mb-5">
              Products
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {products.map((product) => (

                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-black/30 p-5 rounded-2xl cursor-pointer hover:border hover:border-green-500"
                >

                  <h2 className="text-xl font-bold">
                    {product.name}
                  </h2>

                  <p className="text-gray-400 mt-2">
                    ৳ {product.sell_price}
                  </p>

                  <p className="text-sm mt-2">
                    Stock: {product.stock}
                  </p>

                </div>

              ))}

            </div>

          </div>

          {/* Cart */}
          <div className="bg-white/10 rounded-2xl p-5">

            <h2 className="text-2xl font-bold mb-5">
              Cart
            </h2>

            <div className="space-y-4">

              {cart.map((item) => (

                <div
                  key={item.id}
                  className="bg-black/30 p-4 rounded-xl"
                >

                  <h2 className="font-bold">
                    {item.name}
                  </h2>

                  <div className="flex items-center gap-3 mt-2">

  <button
    onClick={() => {

      const updated = cart.map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity:
                cartItem.quantity > 1
                  ? cartItem.quantity - 1
                  : 1,
            }
          : cartItem
      );

      setCart(updated);

    }}
    className="bg-red-500 px-3 py-1 rounded-lg"
  >
    -
  </button>

  <p>
    Qty: {item.quantity}
  </p>

  <button
    onClick={() => {

      const updated = cart.map((cartItem) =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
            }
          : cartItem
      );

      setCart(updated);

    }}
    className="bg-green-500 px-3 py-1 rounded-lg"
  >
    +
  </button>

</div>

                  <p>
                    ৳ {item.sell_price * item.quantity}
                  </p>
<button
  onClick={() => {

    const updated = cart.filter(
      (cartItem) => cartItem.id !== item.id
    );

    setCart(updated);

  }}
  className="mt-3 bg-red-500 px-4 py-2 rounded-xl"
>
  Remove
</button>
                </div>

              ))}

            </div>

            <div className="mt-8 border-t border-white/10 pt-5">

              <h2 className="text-2xl font-bold">
                Total: ৳ {total}
              </h2>

              <button
  onClick={async () => {

    const res = await fetch(
      "/api/sales/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
          total,
        }),
      }
    );

    const data = await res.json();

    if (data.success) {

      setCart([]);

router.push(
  `/dashboard/invoice?invoice=${data.invoice_no}&total=${total}&items=${encodeURIComponent(JSON.stringify(cart))}`
);

    } else {

      alert(data.message);

    }

  }}
  className="w-full mt-5 bg-green-500 py-3 rounded-xl"
>
  Complete Sale
</button>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Home() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (data.success) {
      router.push("/dashboard");
    } else {
      alert(data.message);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-3 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl">

        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 bg-green-500/20 border border-green-500/40 rounded-2xl flex items-center justify-center mx-auto mb-3 text-green-400 font-bold text-xl">
            ⚡
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Autopilot POS
          </h1>

          <p className="text-gray-400 mt-2 text-sm sm:text-base">
            Smart Universal Business Management
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">

          <div>
            <label className="text-xs sm:text-sm text-gray-300 font-medium block mb-1.5 sm:mb-2">
              Email Address
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 sm:p-3.5 rounded-xl bg-black/50 border border-gray-700 text-white text-sm sm:text-base outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="text-xs sm:text-sm text-gray-300 font-medium block mb-1.5 sm:mb-2">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 sm:p-3.5 rounded-xl bg-black/50 border border-gray-700 text-white text-sm sm:text-base outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 active:scale-[0.99] transition-all p-3 sm:p-3.5 rounded-xl text-white font-semibold text-sm sm:text-base shadow-lg shadow-green-500/20"
          >
            Sign In to Store
          </button>

        </form>
      </div>
    </main>
  );
}
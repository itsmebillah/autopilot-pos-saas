"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, LogIn, ArrowRight } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/dashboard");
      } else {
        setErrorMessage(data.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage("Network error occurred. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 bg-green-500/20 border border-green-500/40 rounded-2xl flex items-center justify-center mx-auto mb-3 text-green-400 font-bold text-2xl shadow-lg shadow-green-500/10">
            <Zap size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Autopilot POS
          </h1>

          <p className="text-gray-400 mt-1.5 text-xs sm:text-sm">
            Universal Point of Sale & Retail Management Platform
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Email Address
            </label>

            <input
              type="email"
              placeholder="admin@autopilotpos.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Password
            </label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] transition-all p-3.5 rounded-2xl text-black font-bold text-sm sm:text-base shadow-xl shadow-green-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In to POS</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
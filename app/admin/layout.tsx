"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Store,
  LogOut,
  ExternalLink,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/");
      } else if (!user?.isSuperAdmin) {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user?.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-pulse">
            <Shield size={28} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Verifying Platform Authorization</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Authorizing Master Admin credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Platform Admin Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Autopilot POS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  Master Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Universal Multi-Shop Platform Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick Switch to Retail Dashboard */}
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Store size={15} className="text-green-600 dark:text-green-400" />
              <span>Retail POS Dashboard</span>
              <ExternalLink size={12} className="opacity-60" />
            </Link>

            <ThemeToggle compact />

            {/* Master Admin Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {user.fullName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {user.email}
                </p>
              </div>

              <button
                type="button"
                onClick={signOut}
                title="Sign Out"
                className="p-2 rounded-xl text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-500">
        Autopilot POS Universal SaaS • Platform Architecture v3.2 Stable
      </footer>
    </div>
  );
}

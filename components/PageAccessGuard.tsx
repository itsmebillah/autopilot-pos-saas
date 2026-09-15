"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { PermissionKey, hasPermission } from "@/lib/permissions";
import Sidebar from "@/components/Sidebar";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface PageAccessGuardProps {
  permission: PermissionKey | PermissionKey[];
  children: React.ReactNode;
}

export default function PageAccessGuard({ permission, children }: PageAccessGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors">
        <Sidebar />
        <main className="flex-1 w-full max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[70vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400 dark:text-gray-500 font-mono">Verifying authorization permissions...</p>
          </div>
        </main>
      </div>
    );
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const role = user?.role || "cashier";
  const isSuperAdmin = !!user?.isSuperAdmin;

  const isAllowed = permissions.some((p) => hasPermission(role, p, isSuperAdmin));

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors">
        <Sidebar />
        <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[80vh]">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 sm:p-12 text-center max-w-md shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert size={36} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">403 — Access Forbidden</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-2">
                Your account role <span className="font-bold text-slate-800 dark:text-gray-200 uppercase">({role})</span> does not have permission to access this feature.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-bold text-xs hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                <ArrowLeft size={16} />
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}

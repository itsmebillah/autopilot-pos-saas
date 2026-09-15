"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  Store,
  ChevronDown,
  User,
  LogOut,
  Shield,
  Users,
} from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut, switchStore } = useAuth();

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const isManagement = user?.role === "owner" || user?.role === "manager" || user?.isSuperAdmin;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/sales", label: "Sales POS", icon: ShoppingCart },
    { href: "/dashboard/products", label: "Products", icon: Package },
    { href: "/dashboard/orders", label: "Orders History", icon: Receipt },
    ...(isManagement
      ? [
          { href: "/dashboard/employees", label: "Staff & Employees", icon: Users },
          { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
          { href: "/dashboard/settings", label: "Store Settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Top Navigation Bar (Hidden on lg+ desktops) */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10 w-full print:hidden transition-colors">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-lg">
          <Store className="text-green-600 dark:text-green-500 w-6 h-6" />
          <span>Autopilot POS</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer (Slides in on mobile/tablet) */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-white/10 p-5 flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } print:hidden shadow-2xl`}
      >
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <Store className="text-green-600 dark:text-green-500 w-7 h-7" />
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Autopilot POS</h2>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Universal Retail SaaS</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              aria-label="Close drawer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Active Store Selector (Mobile) */}
          {user && (
            <>
              <div className="mb-5 px-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                  Active Store Outlet
                </label>
                {user.accessibleStores && user.accessibleStores.length > 1 ? (
                  <div className="relative">
                    <select
                      value={user.activeStore?.id || ""}
                      onChange={(e) => switchStore(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 border border-slate-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer appearance-none pr-8 truncate"
                    >
                      {user.accessibleStores.map((store) => (
                        <option key={store.id} value={store.id} className="text-slate-900 bg-white dark:bg-gray-900">
                          {store.name} {store.code ? `(${store.code})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <Store size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                      {user.activeStore?.name || user.storeName || "Primary Store"}
                    </span>
                  </div>
                )}
              </div>

              {/* Platform Super Admin Console Link (Mobile) */}
              {user.isSuperAdmin && (
                <div className="mb-3 px-1">
                  <Link
                    href="/admin"
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/20 transition-all shadow-sm"
                  >
                    <Shield size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Platform Admin Console</span>
                  </Link>
                </div>
              )}
            </>
          )}

          <nav className="space-y-1.5" aria-label="Mobile Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
          {/* User Profile Badge & Logout (Mobile) */}
          {user && (
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={16} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{user.email || user.organizationName}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          <ThemeToggle showLabel />
          <div className="text-xs text-gray-500 text-center">
            Autopilot POS SaaS v3.2
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar (Fixed on desktop screens 1024px+) */}
      <aside className="hidden lg:flex w-64 flex-col justify-between bg-white dark:bg-gray-950/80 border-r border-gray-200 dark:border-white/10 p-5 min-h-screen sticky top-0 h-screen shrink-0 print:hidden transition-colors">
        <div>
          <Link href="/dashboard" className="flex items-center gap-3 mb-6 px-2">
            <Store className="text-green-600 dark:text-green-500 w-8 h-8 shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Autopilot POS</h1>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Universal Retail</p>
            </div>
          </Link>

          {/* Active Store Selector (Desktop) */}
          {user && (
            <>
              <div className="mb-6 px-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                  Active Store Outlet
                </label>
                {user.accessibleStores && user.accessibleStores.length > 1 ? (
                  <div className="relative">
                    <select
                      value={user.activeStore?.id || ""}
                      onChange={(e) => switchStore(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 border border-slate-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer appearance-none pr-8 truncate"
                    >
                      {user.accessibleStores.map((store) => (
                        <option key={store.id} value={store.id} className="text-slate-900 bg-white dark:bg-gray-900">
                          {store.name} {store.code ? `(${store.code})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <Store size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                      {user.activeStore?.name || user.storeName || "Primary Store"}
                    </span>
                  </div>
                )}
              </div>

              {/* Platform Super Admin Console Link (Desktop) */}
              {user.isSuperAdmin && (
                <div className="mb-4 px-1">
                  <Link
                    href="/admin"
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/20 transition-all shadow-sm"
                  >
                    <Shield size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Platform Admin Console</span>
                  </Link>
                </div>
              )}
            </>
          )}

          <nav className="space-y-1.5" aria-label="Desktop Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/10 px-1">
          {/* User Profile Badge & Logout (Desktop) */}
          {user && (
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={16} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{user.email || user.organizationName}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          <ThemeToggle showLabel />
          <div className="text-xs text-gray-500 flex items-center justify-between px-1">
            <span>v3.2.0 Stable</span>
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="Online" />
          </div>
        </div>
      </aside>
    </>
  );
}
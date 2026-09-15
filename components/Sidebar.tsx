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
} from "lucide-react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/sales", label: "Sales POS", icon: ShoppingCart },
    { href: "/dashboard/products", label: "Products", icon: Package },
    { href: "/dashboard/orders", label: "Orders History", icon: Receipt },
    { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
    { href: "/dashboard/settings", label: "Store Settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Top Navigation Bar (Hidden on lg+ desktops) */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-gray-950/90 backdrop-blur-md border-b border-white/10 w-full print:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-white font-bold text-lg">
          <Store className="text-green-500 w-6 h-6" />
          <span>Autopilot POS</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer (Slides in on mobile/tablet) */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gray-950 border-r border-white/10 p-5 flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } print:hidden`}
      >
        <div>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Store className="text-green-500 w-7 h-7" />
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Autopilot POS</h2>
                <span className="text-xs text-green-400 font-medium">Universal Retail SaaS</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              aria-label="Close drawer"
            >
              <X size={20} />
            </button>
          </div>

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
                      ? "bg-green-500/20 text-green-400 border border-green-500/30 font-semibold"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-green-400" : "text-gray-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 text-xs text-gray-500 text-center">
          Autopilot POS SaaS v3.1
        </div>
      </aside>

      {/* Desktop Sidebar (Fixed on desktop screens 1024px+) */}
      <aside className="hidden lg:flex w-64 flex-col justify-between bg-gray-950/80 border-r border-white/10 p-5 min-h-screen sticky top-0 h-screen shrink-0 print:hidden">
        <div>
          <Link href="/dashboard" className="flex items-center gap-3 mb-8 px-2">
            <Store className="text-green-500 w-8 h-8 shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Autopilot POS</h1>
              <p className="text-xs text-green-400 font-medium">Universal Retail</p>
            </div>
          </Link>

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
                      ? "bg-green-500/20 text-green-400 border border-green-500/30 font-semibold"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-green-400" : "text-gray-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 px-2 text-xs text-gray-500 flex items-center justify-between">
          <span>v3.1.0 Stable</span>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="Online" />
        </div>
      </aside>
    </>
  );
}
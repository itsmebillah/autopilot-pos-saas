"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Shield, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ThemeToggle from "./ThemeToggle";
import { platformNavigation } from "@/lib/platform-model";

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  return <div className="platform-shell min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin" className="flex items-center gap-2 min-w-0"><Shield className="text-indigo-600 shrink-0" size={24}/><div><strong className="block text-sm sm:text-lg">SaaS Control Center</strong><span className="text-xs text-slate-500">Autopilot / Platform Owner</span></div></Link>
      <div className="flex items-center gap-2"><ThemeToggle compact/><button onClick={signOut} aria-label="Sign out" className="p-2"><LogOut size={18}/></button><button className="lg:hidden p-2" aria-label="Platform menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button></div>
    </header>
    <div className="lg:flex">
      <nav aria-label="Platform navigation" className={`${open ? "block" : "hidden"} lg:block lg:w-60 shrink-0 p-3 border-b lg:border-r border-slate-200 dark:border-slate-800`}>
        {platformNavigation.map(([href, title]) => <Link key={href} href={href} onClick={() => setOpen(false)}
          aria-current={(href === "/admin" ? path === href : path.startsWith(href)) ? "page" : undefined}
          className={`block rounded-xl px-3 py-3 text-sm font-medium mb-1 ${(href === "/admin" ? path === href : path.startsWith(href)) ? "bg-indigo-600 text-white" : "hover:bg-indigo-50 dark:hover:bg-slate-800"}`}>{title}</Link>)}
      </nav>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-screen-2xl space-y-6">{children}</main>
    </div>
  </div>;
}

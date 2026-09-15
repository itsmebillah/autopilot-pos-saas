"use client";

import { useTheme } from "@/lib/theme-context";
import { Sun, Moon, Laptop } from "lucide-react";

interface ThemeToggleProps {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({
  compact = false,
  showLabel = false,
  className = "",
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const options: { id: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Laptop },
  ];

  if (compact) {
    return (
      <div className={`flex items-center p-1 bg-black/10 dark:bg-white/10 rounded-xl border border-black/10 dark:border-white/10 ${className}`}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              title={`${opt.label} Mode`}
              className={`p-1.5 rounded-lg transition-all ${
                isSelected
                  ? "bg-white text-gray-900 shadow-sm dark:bg-green-500 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 ${className}`}>
      {showLabel && (
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 pl-2">
          Theme: <span className="capitalize text-green-600 dark:text-green-400 font-bold">{theme}</span>
        </span>
      )}
      <div className="flex items-center gap-1">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-white text-gray-900 shadow-sm dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <Icon size={14} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!currentPassword) {
      setStatusMessage({ type: "error", text: "Please enter your current password." });
      return;
    }

    if (newPassword.trim().length < 8) {
      setStatusMessage({ type: "error", text: "New password must be at least 8 non-padding characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    if (currentPassword === newPassword) {
      setStatusMessage({ type: "error", text: "New password cannot be the same as your current password." });
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to change password.");
      }

      setStatusMessage({
        type: "success",
        text: "Password changed successfully! Your new password is now active.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage({
        type: "error",
        text: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 sm:p-7 rounded-2xl sm:rounded-3xl space-y-5 shadow-sm">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
        <KeyRound className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Security & Password</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">Update your account login password</p>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status" aria-live="polite" className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
            statusMessage.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password */}
        <div>
          <label htmlFor="password-current" className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
            Current Password *
          </label>
          <div className="relative">
            <input
              id="password-current" autoComplete="current-password" disabled={isLoading} type={showCurrent ? "text" : "password"}
              required
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 pr-10 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              aria-label={showCurrent ? "Hide password" : "Show password"} onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password & Confirm Password Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password-new" className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
              New Password *
            </label>
            <div className="relative">
              <input
                id="password-new" autoComplete="new-password" disabled={isLoading} type={showNew ? "text" : "password"}
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 pr-10 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                aria-label={showNew ? "Hide password" : "Show password"} onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="password-confirm" className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                id="password-confirm" autoComplete="new-password" disabled={isLoading} type={showConfirm ? "text" : "password"}
                required
                minLength={8}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 pr-10 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                aria-label={showConfirm ? "Hide password" : "Show password"} onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Passwords must be at least 8 non-padding characters.
          </p>

          <button
            type="submit"
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
            <span>{isLoading ? "Updating..." : "Update Password"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

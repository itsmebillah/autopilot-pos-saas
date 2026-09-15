"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, CheckCircle2, AlertTriangle, Eye, EyeOff, ArrowRight, LogIn, Lock } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import ThemeToggle from "@/components/ThemeToggle";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isInitializing, setIsInitializing] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isInvalidOrExpired, setIsInvalidOrExpired] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. Check URL parameters for explicit Supabase error codes (e.g., expired or invalid token)
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";
    const combinedParams = new URLSearchParams(hash.replace(/^#/, "?") || search);

    if (
      combinedParams.get("error") ||
      combinedParams.get("error_code") === "otp_expired" ||
      combinedParams.get("error_code") === "access_denied"
    ) {
      if (mounted) {
        setIsInvalidOrExpired(true);
        setIsInitializing(false);
      }
      return;
    }

    // 2. Listen to Supabase Auth state changes
    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
        setIsInvalidOrExpired(false);
        setIsInitializing(false);
      }
    });

    // 3. Fallback session check
    supabaseBrowser.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error || !session) {
        // Allow a brief grace period for PKCE/hash token exchange
        setTimeout(() => {
          if (mounted && !hasSession) {
            supabaseBrowser.auth.getSession().then(({ data: { session: retrySession } }) => {
              if (mounted) {
                if (retrySession) {
                  setHasSession(true);
                  setIsInvalidOrExpired(false);
                } else {
                  setIsInvalidOrExpired(true);
                }
                setIsInitializing(false);
              }
            });
          }
        }, 1500);
      } else {
        setHasSession(true);
        setIsInvalidOrExpired(false);
        setIsInitializing(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [hasSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabaseBrowser.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to update password. Link may be expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-black dark:via-gray-950 dark:to-black flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400 font-bold shadow-lg shadow-indigo-500/10">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Account Password Reset
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Autopilot POS Employee Credential Setup
          </p>
        </div>

        {/* Loading State */}
        {isInitializing ? (
          <div className="py-10 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold">Verifying secure recovery link...</p>
          </div>
        ) : isSuccess ? (
          /* Success Screen */
          <div className="space-y-5 text-center">
            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-xs font-semibold space-y-1">
              <CheckCircle2 size={28} className="mx-auto text-green-600 dark:text-green-400 mb-1" />
              <p className="text-sm font-bold">Password updated successfully.</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-normal">
                Your new credentials are active. You can now log into your account.
              </p>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full bg-green-500 hover:bg-green-400 text-slate-950 font-bold text-sm py-3.5 px-4 rounded-2xl shadow-xl shadow-green-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn size={18} />
              <span>Continue to Login</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : isInvalidOrExpired ? (
          /* Invalid or Expired Link Screen */
          <div className="space-y-5 text-center">
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold space-y-1">
              <AlertTriangle size={28} className="mx-auto text-red-500 dark:text-red-400 mb-1" />
              <p className="text-sm font-bold">Password reset link is invalid or expired.</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-normal mt-1">
                For security, recovery links can only be used once and expire after a short period.
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please contact your Store Owner or Manager to request a new temporary password or reset link.
            </p>

            <button
              onClick={() => router.push("/")}
              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-sm py-3 px-4 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              <span>Return to Login</span>
            </button>
          </div>
        ) : (
          /* Password Reset Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold text-center">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-3 text-xs font-semibold bg-slate-50 dark:bg-black/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-3 text-xs font-semibold bg-slate-50 dark:bg-black/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Must be at least 8 characters. Do not share your password with anyone.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3.5 px-4 rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Updating Password...</span>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

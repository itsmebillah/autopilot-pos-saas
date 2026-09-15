"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export interface StoreSummary {
  id: string;
  name: string;
  code?: string;
}

export interface UserSessionData {
  id: string;
  email?: string;
  fullName: string;
  phone?: string;
  role: string;
  isSuperAdmin: boolean;
  organizationId?: string;
  organizationName?: string;
  activeStore?: StoreSummary;
  storeName?: string;
  accessibleStores?: StoreSummary[];
}

interface AuthContextType {
  user: UserSessionData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  switchStore: (storeId: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refreshSession: async () => {},
  switchStore: async () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchSessionInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessionInfo();

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
          fetchSessionInfo();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setIsLoading(false);
          router.push("/");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSessionInfo, router]);

  const switchStore = useCallback(async (storeId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/switch-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          await fetchSessionInfo();
          // Force hard reload so all dashboard data, inventories, sales, and settings re-fetch cleanly with zero stale data leakage
          if (typeof window !== "undefined") {
            window.location.reload();
          }
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Store switch error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchSessionInfo]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await supabaseBrowser.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push("/");
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        refreshSession: fetchSessionInfo,
        switchStore,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

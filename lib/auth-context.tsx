"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export interface UserSessionData {
  id: string;
  email?: string;
  fullName: string;
  phone?: string;
  role: string;
  isSuperAdmin: boolean;
  organizationName?: string;
  storeName?: string;
}

interface AuthContextType {
  user: UserSessionData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refreshSession: async () => {},
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

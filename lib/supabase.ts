import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dhgfevlwiwcblobpxjca.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && typeof window !== "undefined") {
  console.warn("⚠️ Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured in browser environment.");
}

/**
 * Standard Supabase client (Browser & Public API routes)
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || "sb_anon_unconfigured",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Server-only Supabase Admin client (Uses service_role key for atomic backend operations)
 */
export function getServerSupabaseAdmin() {
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (!key) {
    throw new Error("Supabase credentials are not configured on server.");
  }
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

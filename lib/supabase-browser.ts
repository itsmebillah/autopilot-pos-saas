import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dhgfevlwiwcblobpxjca.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Creates or returns a browser Supabase client configured with SSR cookie handling.
 * Safe to call repeatedly in client components.
 */
export function createClient() {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}

export const supabaseBrowser = createClient();

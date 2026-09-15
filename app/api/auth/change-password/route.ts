import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function reply(message: string, status = 400) {
  return NextResponse.json({ success: status === 200, message }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) return reply("Request origin is not allowed.", 403);
  if (!req.headers.get("content-type")?.startsWith("application/json")) return reply("Expected a JSON request.", 415);
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) return reply("Please sign in again.", 401);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return reply("Invalid request.");
    const { currentPassword, newPassword, confirmPassword } = body;
    if (typeof currentPassword !== "string" || !currentPassword) return reply("Current password is required.");
    if (typeof newPassword !== "string" || newPassword.trim().length < 8) return reply("New password must contain at least 8 non-padding characters.");
    if (newPassword !== confirmPassword) return reply("New password and confirmation do not match.");
    if (newPassword === currentPassword) return reply("Choose a different new password.");
    // Verify independently without replacing browser cookies or using admin privileges.
    const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const verified = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verified.error) {
      return verified.error.status === 429
        ? reply("Too many attempts. Please wait and try again.", 429)
        : reply("Current password could not be verified. Please try again.");
    }
    try {
      if (verified.data.user?.id !== user.id) return reply("Account verification failed.", 403);
      const updated = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword });
      if (updated.error) {
        if (updated.error.code === "weak_password") return reply("Password is too weak. Choose a stronger password.");
        if (updated.error.status === 429) return reply("Too many attempts. Please wait and try again.", 429);
        return reply("Unable to change password. Check your password or sign in again and retry.");
      }
      return reply("Password changed successfully.", 200);
    } finally {
      await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
  } catch {
    return reply("Unable to change password. Please try again.", 500);
  }
}

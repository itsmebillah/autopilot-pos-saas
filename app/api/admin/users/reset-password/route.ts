import { NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) {
      return NextResponse.json({ success: false, message: "Forbidden — Invalid request origin" }, { status: 403 });
    }

    const session = await requireAuth();
    requireSuperAdmin(session);

    const body = await req.json().catch(() => ({}));
    const { userId, newPassword } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing required parameter: userId" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const adminClient = getServerSupabaseAdmin();

    // Verify user exists in auth.users
    const { data: userObj, error: getUserErr } = await adminClient.auth.admin.getUserById(userId);
    if (getUserErr || !userObj?.user) {
      return NextResponse.json(
        { success: false, message: "Target user profile not found in system directory." },
        { status: 404 }
      );
    }

    // Update password via Supabase Auth Admin API
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateErr) {
      return NextResponse.json(
        { success: false, message: `Failed to reset user password: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password successfully updated for ${userObj.user.email || "user"}.`,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to reset password" },
      { status: error.status || 500 }
    );
  }
}

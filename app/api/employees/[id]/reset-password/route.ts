import { NextResponse } from "next/server";
import { requireShopAuth, requireRole } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";
import { getAppBaseUrl } from "@/lib/app-url";

function generateSecurePassword(length = 14): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const nums = "0123456789";
  const symbols = "!@#$%^&*";
  const chars = upper + lower + nums + symbols;

  const password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  for (let i = 4; i < length; i++) {
    password.push(chars[Math.floor(Math.random() * chars.length)]);
  }

  return password.sort(() => Math.random() - 0.5).join("");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireShopAuth();
    requireRole(session, ["owner", "manager"]);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action || "link";

    const adminClient = getServerSupabaseAdmin();
    const orgId = session.organization.id;

    // Verify employee belongs to current organization by organization_members.id or user_id
    let member: { id: string; user_id: string; organization_id: string; is_active: boolean } | null = null;

    const { data: memberById } = await adminClient
      .from("organization_members")
      .select("id, user_id, organization_id, is_active")
      .eq("id", id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (memberById) {
      member = memberById;
    } else {
      const { data: memberByUserId } = await adminClient
        .from("organization_members")
        .select("id, user_id, organization_id, is_active")
        .eq("user_id", id)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (memberByUserId) {
        member = memberByUserId;
      }
    }

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Forbidden — Target employee not found in your organization" },
        { status: 404 }
      );
    }

    // Get user details from Supabase Auth
    const { data: authUser, error: userErr } = await adminClient.auth.admin.getUserById(member.user_id);
    if (userErr || !authUser?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Failed to resolve employee auth account" },
        { status: 400 }
      );
    }

    // Handle Password Actions
    if (action === "set_password") {
      const newPassword = body.password;
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        return NextResponse.json(
          { success: false, message: "New temporary password must be at least 8 characters long" },
          { status: 400 }
        );
      }

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(member.user_id, {
        password: newPassword,
        email_confirm: true,
      });

      if (updateErr) {
        throw updateErr;
      }

      return NextResponse.json({
        success: true,
        message: "Temporary password updated successfully.",
      });
    }

    if (action === "generate") {
      const generatedPassword = generateSecurePassword(14);

      const { error: updateErr } = await adminClient.auth.admin.updateUserById(member.user_id, {
        password: generatedPassword,
        email_confirm: true,
      });

      if (updateErr) {
        throw updateErr;
      }

      return NextResponse.json({
        success: true,
        message: "Temporary password generated successfully.",
        temporaryPassword: generatedPassword,
      });
    }

    // Default Action: Password Recovery Link with Environment-Aware Redirect URL
    const baseUrl = getAppBaseUrl();
    const redirectTo = `${baseUrl}/auth/reset-password`;

    const { data: linkData, error: resetErr } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: authUser.user.email,
      options: {
        redirectTo,
      },
    });

    if (resetErr) {
      throw resetErr;
    }

    return NextResponse.json({
      success: true,
      message: `Password reset link generated for ${authUser.user.email}`,
      recoveryLink: linkData?.properties?.action_link || null,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process password management request" },
      { status: error.status || 500 }
    );
  }
}

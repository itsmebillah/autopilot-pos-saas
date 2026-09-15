import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireRole(session, ["owner", "manager"]);

    const { id } = await params;
    const adminClient = getServerSupabaseAdmin();
    const orgId = session.organization.id;

    // Verify employee belongs to current organization
    const { data: member, error: memberErr } = await adminClient
      .from("organization_members")
      .select("user_id, organization_id")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (memberErr || !member) {
      return NextResponse.json(
        { success: false, message: "Employee not found in your organization" },
        { status: 404 }
      );
    }

    // Get user email
    const { data: authUser, error: userErr } = await adminClient.auth.admin.getUserById(member.user_id);
    if (userErr || !authUser?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Failed to resolve employee email" },
        { status: 400 }
      );
    }

    // Generate password reset link / email
    const { data: linkData, error: resetErr } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: authUser.user.email,
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
      { success: false, message: error.message || "Failed to trigger password reset" },
      { status: error.status || 500 }
    );
  }
}

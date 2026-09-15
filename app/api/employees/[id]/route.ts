import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireRole(session, ["owner", "manager"]);

    const { id } = await params;
    const body = await req.json();
    const { role, isActive, storeId, fullName, phone } = body;

    const adminClient = getServerSupabaseAdmin();
    const orgId = session.organization.id;

    // 1. Fetch the target membership to verify tenant ownership
    const { data: targetMember, error: fetchErr } = await adminClient
      .from("organization_members")
      .select("id, user_id, role, organization_id, is_active")
      .eq("id", id)
      .eq("organization_id", orgId)
      .single();

    if (fetchErr || !targetMember) {
      return NextResponse.json(
        { success: false, message: "Employee not found in your organization" },
        { status: 404 }
      );
    }

    // Protection rule: Cannot deactivate or demote the only owner or yourself if you are an owner
    if (targetMember.role === "owner" && targetMember.user_id === session.user.id && isActive === false) {
      return NextResponse.json(
        { success: false, message: "You cannot deactivate your own primary owner account" },
        { status: 400 }
      );
    }

    // Role safety: Managers cannot edit an Owner or promote to Owner
    if (session.role === "manager") {
      if (targetMember.role === "owner" || role === "owner") {
        return NextResponse.json(
          { success: false, message: "Forbidden — Managers cannot modify Owner roles" },
          { status: 403 }
        );
      }
    }

    // 2. Update organization_members
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (role) updatePayload.role = role.toLowerCase();
    if (typeof isActive === "boolean") updatePayload.is_active = isActive;

    const { data: updatedMember, error: updateErr } = await adminClient
      .from("organization_members")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      throw updateErr;
    }

    // 3. Update store assignment if storeId provided
    if (storeId) {
      // Verify target store belongs to org
      const { data: validStore } = await adminClient
        .from("stores")
        .select("id")
        .eq("id", storeId)
        .eq("organization_id", orgId)
        .single();

      if (validStore) {
        await adminClient.from("store_members").upsert(
          {
            store_id: storeId,
            user_id: targetMember.user_id,
          },
          { onConflict: "store_id,user_id" }
        );
      }
    }

    // 4. Update profile details if provided
    if (fullName || phone !== undefined) {
      const profileUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (fullName) profileUpdates.full_name = fullName;
      if (phone !== undefined) profileUpdates.phone = phone;

      await adminClient
        .from("user_profiles")
        .update(profileUpdates)
        .eq("id", targetMember.user_id);
    }

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
      employee: updatedMember,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update employee" },
      { status: error.status || 500 }
    );
  }
}

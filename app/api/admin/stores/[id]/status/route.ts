import { NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireSuperAdmin(session);

    const { id } = await params;
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, message: "isActive boolean is required" },
        { status: 400 }
      );
    }

    const adminClient = getServerSupabaseAdmin();
    const { data: updated, error } = await adminClient
      .from("stores")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, name, is_active, organization_id")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { success: false, message: error?.message || "Failed to update store status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Store "${updated.name}" is now ${isActive ? "Active" : "Suspended"}`,
      store: updated,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update store status" },
      { status: error.status || 500 }
    );
  }
}

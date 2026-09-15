import { NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await requireAuth();
    requireSuperAdmin(session);

    const adminClient = getServerSupabaseAdmin();
    const { data: categories, error } = await adminClient
      .from("shop_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      categories: categories || [],
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch shop categories" },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin) return NextResponse.json({ message: "Invalid origin." }, { status: 403 });
    const session = await requireAuth();
    requireSuperAdmin(session);
    const { id, name, modules } = await req.json();
    if (typeof id !== "string" || typeof name !== "string" || !name.trim() || name.length > 100 ||
        !Array.isArray(modules) || modules.length > 50 || modules.some(m => typeof m !== "string" || !/^mod_[a-z0-9_]+$/.test(m))) {
      return NextResponse.json({ message: "Invalid category settings." }, { status: 400 });
    }
    const { data, error } = await getServerSupabaseAdmin().from("shop_categories")
      .update({ name: name.trim(), default_modules: [...new Set(modules)] }).eq("id", id).select("id").single();
    if (error || !data) return NextResponse.json({ message: "Category could not be saved." }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ message: "Category update denied." }, { status: (e as { status?: number }).status || 500 });
  }
}

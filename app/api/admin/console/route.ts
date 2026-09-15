import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

async function authorize(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) throw Object.assign(new Error("Invalid origin"), { status: 403 });
  const session = await requireAuth();
  requireSuperAdmin(session);
}
export async function POST(req: Request) {
  try {
    await authorize(req);
    const { storeId } = await req.json();
    if (typeof storeId !== "string") return NextResponse.json({ message: "Choose a shop." }, { status: 400 });
    const { data, error } = await getServerSupabaseAdmin().from("stores")
      .select("id, is_active, organizations(subscription_status)").eq("id", storeId).single();
    const org = data?.organizations as unknown as { subscription_status: string } | null;
    if (error || !data?.is_active || org?.subscription_status === "suspended") return NextResponse.json({ message: "Shop is missing or suspended. Activate it before entering." }, { status: 409 });
    const jar = await cookies();
    const options = { path: "/", httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 3600 };
    jar.set("pos_shop_console_id", data.id, options);
    jar.set("pos_active_store_id", data.id, options);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ message: "Shop console access denied." }, { status: (e as { status?: number }).status || 500 });
  }
}
export async function DELETE(req: Request) {
  try {
    await authorize(req);
    const jar = await cookies();
    jar.delete("pos_shop_console_id");
    jar.delete("pos_active_store_id");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ message: "Access denied." }, { status: (e as { status?: number }).status || 500 });
  }
}

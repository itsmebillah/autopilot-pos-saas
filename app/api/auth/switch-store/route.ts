import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthenticatedSession } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { storeId } = body;

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid or missing storeId" },
        { status: 400 }
      );
    }

    // Authoritative check: User can only switch to a store they have verified access to
    const targetStore = session.accessibleStores.find((s) => s.id === storeId);
    if (!targetStore) {
      return NextResponse.json(
        { success: false, message: "Forbidden — You do not have access to this store" },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("pos_active_store_id", targetStore.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({
      success: true,
      message: `Active store changed to ${targetStore.name}`,
      activeStore: targetStore,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to switch active store" },
      { status: 500 }
    );
  }
}

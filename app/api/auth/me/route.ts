import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth-guard";

export async function GET() {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.profile.fullName,
        phone: session.profile.phone,
        role: session.role,
        isSuperAdmin: session.profile.isSuperAdmin,
        shopConsole: !!session.shopConsole,
        organizationId: session.organization.id,
        organizationName: session.organization.name,
        activeStore: session.store,
        storeName: session.store.name,
        accessibleStores: session.accessibleStores,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to resolve user session" },
      { status: 500 }
    );
  }
}

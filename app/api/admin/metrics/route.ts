import { NextResponse } from "next/server";
import { loadPlatform } from "@/lib/platform-data";
export async function GET() {
  try {
    const { metrics } = await loadPlatform();
    return NextResponse.json({ success: true, metrics }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ success: false, message: "Platform metrics unavailable." }, { status: (e as { status?: number }).status || 500 });
  }
}

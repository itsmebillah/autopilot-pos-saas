import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    requireRole(session, ["owner", "manager"]);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "No file provided",
        },
        { status: 400 }
      );
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { error } = await supabase.storage
      .from("logos")
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("logos")
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Upload Error",
      },
      { status: error.status || 500 }
    );
  }
}
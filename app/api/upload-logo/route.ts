import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  try {

    const formData =
      await req.formData();

    const file =
      formData.get("file") as File;

    if (!file) {

      return NextResponse.json({
        success: false,
        message: "No file",
      });

    }

    const fileName =
      `${Date.now()}-${file.name}`;

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    const { error } =
      await supabase.storage
        .from("logos")
        .upload(
          fileName,
          buffer,
          {
            contentType:
              file.type,
          }
        );

    if (error) {

      return NextResponse.json({
        success: false,
        message: error.message,
      });

    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("logos")
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url:
        publicUrlData.publicUrl,
    });

  } catch {

    return NextResponse.json({
      success: false,
      message: "Upload Error",
    });

  }
}
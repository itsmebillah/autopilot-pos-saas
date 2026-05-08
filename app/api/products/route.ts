import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const {
  name,
  barcode,
  category,
  buy_price,
  sell_price,
  stock,
} = body;

const { data: existingProduct } =
  await supabase
    .from("products")
    .select("*")
    .eq("name", name)
    .limit(1)
    .single();

if (existingProduct) {

  const updatedStock =
    Number(existingProduct.stock)
    + Number(stock);

  await supabase
    .from("products")
    .update({
      stock: updatedStock,
      buy_price,
      sell_price,
      category,
    })
    .eq("id", existingProduct.id);

  return NextResponse.json({
    success: true,
    message: "Stock Updated",
  });
}
    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          barcode,
          category,
          buy_price,
          sell_price,
          stock,
        },
      ]);

    if (error) {
      return NextResponse.json({
        success: false,
        message: error.message,
      });
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {

    return NextResponse.json({
      success: false,
      message: "Server Error",
    });

  }
}
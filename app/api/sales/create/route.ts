import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const { cart, total } = body;

    const invoice_no =
      "INV-" + Date.now();

    const { data: saleData, error } =
      await supabase
        .from("sales")
        .insert([
          {
            invoice_no,
            total,
          },
        ])
        .select()
        .single();

    if (error) {

      return NextResponse.json({
        success: false,
        message: error.message,
      });

    }

    const saleItems = cart.map((item: any) => ({
      sale_id: saleData.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.sell_price,
      cost: item.buy_price,
      profit:
        (item.sell_price - item.buy_price)
        * item.quantity,
    }));

    await supabase
      .from("sale_items")
      .insert(saleItems);
      for (const item of cart) {

  const newStock =
    Number(item.stock) - Number(item.quantity);

  await supabase
    .from("products")
    .update({
      stock: newStock,
    })
    .eq("id", item.id);

}

    return NextResponse.json({
  success: true,
  invoice_no,
  cart,
});

  } catch {

    return NextResponse.json({
      success: false,
      message: "Server Error",
    });

  }
}
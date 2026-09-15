import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { generateInvoiceNumber, buildInvoiceData } from "@/lib/invoice-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      cart = [],
      customer_name,
      customer_phone,
      discount_amount = 0,
      tax_amount = 0,
      total,
      paid_amount,
      change_amount = 0,
      due_amount = 0,
      payments = [],
      notes,
    } = body;

    if (!cart || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart cannot be empty" },
        { status: 400 }
      );
    }

    const calculatedTotal = Number(total || cart.reduce(
      (sum: number, item: any) => sum + Number(item.sell_price || 0) * item.quantity,
      0
    ));

    const finalPaid = Number(paid_amount ?? (payments.length > 0
      ? payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
      : calculatedTotal));

    const finalDue = Number(due_amount ?? Math.max(0, calculatedTotal - finalPaid));
    const finalChange = Number(change_amount ?? Math.max(0, finalPaid - calculatedTotal));
    const paymentStatus = finalDue <= 0 ? "PAID" : finalPaid > 0 ? "PARTIAL" : "DUE";

    const invoice_no = generateInvoiceNumber("STA");

    // 1. Insert Sales Record
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          invoice_no,
          total: calculatedTotal,
          discount_amount: Number(discount_amount || 0),
          tax_amount: Number(tax_amount || 0),
          paid_amount: finalPaid,
          change_amount: finalChange,
          due_amount: finalDue,
          payment_status: paymentStatus,
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (saleError || !saleData) {
      return NextResponse.json(
        { success: false, message: saleError?.message || "Failed to create sale record" },
        { status: 500 }
      );
    }

    // 2. Insert Sale Items (Preserving immutable transaction snapshot)
    const saleItems = cart.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const sellPrice = Number(item.sell_price ?? item.price ?? 0);
      const buyPrice = Number(item.buy_price ?? item.cost_price ?? item.cost ?? 0);
      const subtotal = qty * sellPrice;

      return {
        sale_id: saleData.id,
        product_id: item.id,
        product_name: item.name || "Product",
        quantity: qty,
        unit_price: sellPrice,
        unit_cost: buyPrice,
        price: sellPrice,
        cost: buyPrice,
        subtotal: subtotal,
        total: subtotal,
        profit: (sellPrice - buyPrice) * qty,
      };
    });

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);
    if (itemsError) {
      console.warn("Sale items insertion warning:", itemsError);
    }

    // 3. Insert Payment Tenders
    const paymentRows = (payments.length > 0 ? payments : [{ method: "CASH", amount: finalPaid }]).map(
      (p: any) => ({
        sale_id: saleData.id,
        payment_method: p.method || p.payment_method || "CASH",
        amount: Number(p.amount || 0),
        transaction_ref: p.transaction_ref || null,
      })
    );

    const { error: paymentsError } = await supabase.from("payments").insert(paymentRows);
    if (paymentsError) {
      console.warn("Payments insertion warning:", paymentsError);
    }

    // 4. Update Stock & Log Stock Movements Ledger (Server-authoritative)
    for (const item of cart) {
      if (!item.id) continue;

      const { data: dbProduct } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.id)
        .single();

      const currentStock = dbProduct ? Number(dbProduct.stock) : Number(item.stock || 0);
      const qtyDeducted = Number(item.quantity) || 1;
      const newStock = Math.max(0, currentStock - qtyDeducted);

      // Update product stock
      await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.id);

      // Record immutable stock movement
      try {
        await supabase.from("stock_movements").insert([
          {
            movement_type: "SALE",
            quantity: -qtyDeducted,
            previous_stock: currentStock,
            new_stock: newStock,
            reference_id: saleData.id,
            reference_type: "SALE",
            notes: `POS Sale: ${invoice_no}`,
          },
        ]);
      } catch {
        // Stock movement logging error non-blocking
      }
    }

    // 5. Fetch Store Settings to build complete Invoice snapshot
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .single();

    const saleSnapshot = {
      ...saleData,
      customer_name,
      customer_phone,
    };

    const invoice = buildInvoiceData(
      saleSnapshot,
      saleItems,
      paymentRows,
      settings || {}
    );

    return NextResponse.json({
      success: true,
      invoice_no,
      sale_id: saleData.id,
      invoice,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
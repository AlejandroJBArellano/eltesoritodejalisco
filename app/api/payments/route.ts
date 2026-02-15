// TesoritoOS - Payments API
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, method, amount, receivedAmount, change } = body;

    if (!orderId || !method || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Crear el registro de pago
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: orderId,
        method,
        amount: Number(amount),
        received_amount: receivedAmount ? Number(receivedAmount) : null,
        change: change ? Number(change) : null,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // 2. Actualizar el estado de la orden a PAID
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({ status: "PAID" })
      .eq("id", orderId)
      .select()
      .single();

    if (orderError) throw orderError;

    return NextResponse.json({ payment, order }, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}

// TesoritoOS - Payments API
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, method, amount, receivedAmount, change, tipAmount } = body;

    if (!orderId || !method || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Crear el registro de pago
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        id: crypto.randomUUID(),
        order_id: orderId,
        method,
        amount: Number(amount),
        received_amount: receivedAmount ? Number(receivedAmount) : null,
        change: change ? Number(change) : null,
        tip_amount: tipAmount ? Number(tipAmount) : 0,
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
    
    // 3. Descontar inventario automáticamente al cobrar
    const { deductInventoryForOrder } = await import("@/lib/services/inventory");
    try {
      await deductInventoryForOrder(orderId);
    } catch (deductError) {
      console.error("Error deducting inventory:", deductError);
    }
 
    return NextResponse.json({ payment, order }, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, tipAmount } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const supabase = await createClient();

    // Actualizar la propina en el registro de pago asociado a la orden
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .update({
        tip_amount: Number(tipAmount) || 0,
      })
      .eq("order_id", orderId)
      .select()
      .single();

    if (paymentError) throw paymentError;

    return NextResponse.json({ payment }, { status: 200 });
  } catch (error) {
    console.error("Error updating tip:", error);
    return NextResponse.json({ error: "Failed to update tip" }, { status: 500 });
  }
}

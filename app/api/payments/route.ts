// TesoritoOS - Payments API
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type PaymentInput = {
  amount: number;
  method: string;
  tipAmount: number;
  receivedAmount?: number;
  change?: number;
};

const toPaymentInsert = (orderId: string, payment: PaymentInput) => ({
  id: crypto.randomUUID(),
  order_id: orderId,
  method: payment.method,
  amount: Number(payment.amount),
  received_amount:
    payment.receivedAmount != null ? Number(payment.receivedAmount) : null,
  change: payment.change != null ? Number(payment.change) : null,
  tip_amount: payment.tipAmount ? Number(payment.tipAmount) : 0,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Split-bill flow: array of individual payments for a single order
    if (body.splits && Array.isArray(body.splits)) {
      const { orderId, splits } = body as {
        orderId: string;
        splits: {
          amount: number;
          method: string;
          tipAmount: number;
          receivedAmount?: number;
          change?: number;
        }[];
      };

      if (!orderId || !splits.length) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const supabase = await createClient();

      // 1. Insertar un registro de pago por cada parte
      const { error: splitError } = await supabase
        .from("payments")
        .insert(splits.map((split) => toPaymentInsert(orderId, split)));

      if (splitError) throw splitError;

      // 2. Actualizar el estado de la orden a PAID
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "PAID" })
        .eq("id", orderId);
      if (orderError) throw orderError;

      // 3. Descontar inventario automáticamente al cobrar
      const { deductInventoryForOrder } = await import("@/lib/services/inventory");
      try {
        await deductInventoryForOrder(orderId);
      } catch (deductError) {
        console.error("Error deducting inventory:", deductError);
      }

      return NextResponse.json({ success: true }, { status: 201 });
    }

    // Standard single-payment flow
    const { orderId, method, amount, receivedAmount, change, tipAmount } = body;

    if (!orderId || !method || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Crear el registro de pago
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        ...toPaymentInsert(orderId, {
          amount,
          method,
          receivedAmount,
          change,
          tipAmount,
        }),
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

    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("id, amount")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (paymentError) throw paymentError;
    if (!payments?.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const totalTipCents = Math.round((Number(tipAmount) || 0) * 100);
    const totalAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    let assignedTipCents = 0;

    for (let index = 0; index < payments.length; index += 1) {
      const payment = payments[index];
      const isLastPayment = index === payments.length - 1;
      const paymentTipCents =
        payments.length === 1
          ? totalTipCents
          : isLastPayment
            ? totalTipCents - assignedTipCents
            : totalAmount > 0
              ? Math.round(
                  (totalTipCents * Number(payment.amount || 0)) / totalAmount,
                )
              : Math.round(totalTipCents / payments.length);

      assignedTipCents += paymentTipCents;

      const { error: updateError } = await supabase
        .from("payments")
        .update({
          tip_amount: paymentTipCents / 100,
        })
        .eq("id", payment.id);

      if (updateError) throw updateError;
    }

    const { data: updatedPayments, error: fetchUpdatedPaymentsError } =
      await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

    if (fetchUpdatedPaymentsError) throw fetchUpdatedPaymentsError;

    return NextResponse.json({ payments: updatedPayments }, { status: 200 });
  } catch (error) {
    console.error("Error updating tip:", error);
    return NextResponse.json({ error: "Failed to update tip" }, { status: 500 });
  }
}

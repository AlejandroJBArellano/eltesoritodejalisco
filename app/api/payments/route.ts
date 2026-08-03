// TesoritoOS - Payments API
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

type PaymentInput = {
  amount: number;
  method: string;
  tipAmount: number;
  receivedAmount?: number;
  change?: number;
};

const CENTS_PER_PESO = 100;

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

const getDistributedTipCents = ({
  index,
  paymentsCount,
  totalTipCents,
  assignedTipCents,
  paymentAmountCents,
  totalAmountCents,
}: {
  index: number;
  paymentsCount: number;
  totalTipCents: number;
  assignedTipCents: number;
  paymentAmountCents: number;
  totalAmountCents: number;
}) => {
  if (paymentsCount === 1) return totalTipCents;
  if (index === paymentsCount - 1) return totalTipCents - assignedTipCents;
  if (totalAmountCents > 0) {
    return Math.round((totalTipCents * paymentAmountCents) / totalAmountCents);
  }

  return Math.round(totalTipCents / paymentsCount);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = body.orderId;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // Check if the order is already archived/closed under a daily cut
    const { data: orderToCheck, error: fetchOrderError } = await supabase
      .from("orders")
      .select("corte_id, estado_cierre")
      .eq("id", orderId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (fetchOrderError || !orderToCheck) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (orderToCheck.corte_id || orderToCheck.estado_cierre === "ARCHIVADA") {
      return NextResponse.json(
        {
          error:
            "La orden pertenece a un corte de caja cerrado y no puede ser modificada o cobrada",
        },
        { status: 400 },
      );
    }

    // Split-bill flow: array of individual payments for a single order
    if (body.splits && Array.isArray(body.splits)) {
      const { splits } = body as {
        splits: {
          amount: number;
          method: string;
          tipAmount: number;
          receivedAmount?: number;
          change?: number;
        }[];
      };

      if (!splits.length) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      // 1. Insertar un registro de pago por cada parte
      const { error: splitError } = await supabase
        .from("payments")
        .insert(splits.map((split) => toPaymentInsert(orderId, split)));

      if (splitError) {
        console.error(
          "[Split Payments] Error inserting payment records:",
          splitError,
        );
        throw splitError;
      }

      // 2. Actualizar el estado de la orden a PAID
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "PAID" })
        .eq("id", orderId);
      if (orderError) {
        console.error(
          `[Split Payments] Error updating order ${orderId} status:`,
          orderError,
        );
        throw orderError;
      }

      return NextResponse.json({ success: true }, { status: 201 });
    }

    // Standard single-payment flow
    const { method, amount, receivedAmount, change, tipAmount } = body;

    if (!method || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

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

    return NextResponse.json({ payment, order }, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, tipAmount } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("id, amount")
      .eq("order_id", orderId)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });

    if (paymentError) throw paymentError;
    if (!payments?.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const totalTipCents = Math.round((Number(tipAmount) || 0) * CENTS_PER_PESO);
    const paymentAmountCents = payments.map((payment) =>
      Math.round(Number(payment.amount || 0) * CENTS_PER_PESO),
    );
    const totalAmountCents = paymentAmountCents.reduce(
      (sum, amount) => sum + amount,
      0,
    );

    let assignedTipCents = 0;
    const paymentUpdates: { id: string; tip_amount: number }[] = [];

    for (let index = 0; index < payments.length; index++) {
      const payment = payments[index];
      const paymentTipCents = getDistributedTipCents({
        index,
        paymentsCount: payments.length,
        totalTipCents,
        assignedTipCents,
        paymentAmountCents: paymentAmountCents[index],
        totalAmountCents,
      });

      assignedTipCents += paymentTipCents;
      paymentUpdates.push({
        id: payment.id,
        tip_amount: paymentTipCents / CENTS_PER_PESO,
      });
    }

    const updateResults = await Promise.all(
      paymentUpdates.map((paymentUpdate) =>
        supabase
          .from("payments")
          .update({
            tip_amount: paymentUpdate.tip_amount,
          })
          .eq("id", paymentUpdate.id),
      ),
    );

    for (const { error: updateError } of updateResults) {
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
    return NextResponse.json(
      { error: "Failed to update tip" },
      { status: 500 },
    );
  }
}

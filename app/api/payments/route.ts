// TesoritoOS - Payments API
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, method, amount, receivedAmount, change } = body;

    if (!orderId || !method || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Usamos una transacción para asegurar que el pago y el estado se actualicen juntos
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el registro de pago
      const payment = await tx.payment.create({
        data: {
          orderId,
          method: method as PaymentMethod,
          amount: Number(amount),
          receivedAmount: receivedAmount ? Number(receivedAmount) : null,
          change: change ? Number(change) : null,
        },
      });

      // 2. Actualizar el estado de la orden a PAID
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      return { payment, order };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}

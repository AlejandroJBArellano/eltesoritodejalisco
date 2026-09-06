import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { PaymentMethod } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: customerId } = await params;
    const tenant = await getTenantContext();
    const supabase = await createClient();

    // 1. Obtener datos del cliente
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .eq("tenant_id", tenant.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // 2. Obtener órdenes a crédito o pendientes de cobro
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        created_at,
        operational_date,
        status,
        total,
        notes,
        table,
        order_items (
          id,
          quantity,
          unit_price,
          menu_items (
            id,
            name
          )
        ),
        payments (
          id,
          amount,
          method,
          created_at,
          tip_amount
        )
      `)
      .eq("customer_id", customerId)
      .eq("tenant_id", tenant.id)
      .eq("status", "UNCOLLECTED")
      .order("created_at", { ascending: true });

    if (ordersError) throw ordersError;

    // 3. Procesar desglose por nota
    const pendingNotes = (orders || []).map((order) => {
      const totalPaid = (order.payments || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );
      const remainingBalance = Math.max(0, Number(order.total || 0) - totalPaid);

      type RawOrderItem = {
        id: string;
        quantity: number;
        unit_price: number;
        menu_items: { id: string; name: string } | null;
      };

      const rawItems = (order.order_items || []) as unknown as RawOrderItem[];
      const items = rawItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        name: item.menu_items?.name || "Producto",
      }));

      return {
        id: order.id,
        orderNumber: order.order_number,
        createdAt: order.created_at,
        operationalDate: order.operational_date,
        total: Number(order.total || 0),
        totalPaid,
        remainingBalance,
        notes: order.notes,
        table: order.table,
        items,
        payments: (order.payments || []).map((p) => ({
          id: p.id,
          amount: Number(p.amount || 0),
          method: p.method,
          createdAt: p.created_at,
        })),
      };
    });

    const totalDebt = pendingNotes.reduce(
      (acc, note) => acc + note.remainingBalance,
      0
    );

    return NextResponse.json({
      customer,
      pendingNotes,
      totalDebt,
    });
  } catch (error) {
    console.error("Error al obtener estado de cuenta:", error);
    return NextResponse.json(
      { error: "Error al cargar estado de cuenta" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: customerId } = await params;
    const body = await request.json();
    const { amount, method, receivedAmount, change, notes } = body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const validMethods: string[] = [
      PaymentMethod.CASH,
      PaymentMethod.CARD,
      PaymentMethod.TRANSFER,
      PaymentMethod.OTHER,
    ];

    if (!method || !validMethods.includes(method)) {
      return NextResponse.json(
        { error: "Método de pago no válido" },
        { status: 400 }
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // 1. Obtener órdenes pendientes en orden FIFO (más antiguas primero)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        total,
        status,
        created_at,
        payments (
          amount
        )
      `)
      .eq("customer_id", customerId)
      .eq("tenant_id", tenant.id)
      .eq("status", "UNCOLLECTED")
      .order("created_at", { ascending: true });

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: "No hay notas pendientes para este cliente" },
        { status: 400 }
      );
    }

    let remainingToDistribute = paymentAmount;
    const paymentRecords: {
      order_id: string;
      tenant_id: string;
      amount: number;
      method: "CASH" | "CARD" | "TRANSFER" | "OTHER";
      received_amount?: number;
      change?: number;
    }[] = [];
    const ordersFullyPaid: string[] = [];

    for (const order of orders) {
      if (remainingToDistribute <= 0) break;

      const orderPayments = order.payments || [];
      const alreadyPaid = orderPayments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );
      const balance = Math.max(0, Number(order.total || 0) - alreadyPaid);

      if (balance <= 0) continue;

      const appliedToThis = Math.min(remainingToDistribute, balance);

      paymentRecords.push({
        order_id: order.id,
        tenant_id: tenant.id,
        amount: appliedToThis,
        method: method as "CASH" | "CARD" | "TRANSFER" | "OTHER",
        received_amount: method === "CASH" ? Number(receivedAmount || appliedToThis) : appliedToThis,
        change: method === "CASH" ? Number(change || 0) : 0,
      });

      remainingToDistribute -= appliedToThis;

      // Si la nota se liquida por completo
      if (appliedToThis >= balance) {
        ordersFullyPaid.push(order.id);
      }
    }

    // 2. Insertar registros en payments
    if (paymentRecords.length > 0) {
      const { error: insertPaymentsError } = await supabase
        .from("payments")
        .insert(paymentRecords);

      if (insertPaymentsError) throw insertPaymentsError;
    }

    // 3. Actualizar a PAID las órdenes totalmente saldadas
    if (ordersFullyPaid.length > 0) {
      const { error: updateOrdersError } = await supabase
        .from("orders")
        .update({ status: "PAID" })
        .in("id", ordersFullyPaid);

      if (updateOrdersError) throw updateOrdersError;
    }

    // 4. Registrar en notas o actualizar puntos/gasto del cliente si corresponde
    const totalApplied = paymentAmount - Math.max(0, remainingToDistribute);

    return NextResponse.json({
      success: true,
      appliedAmount: totalApplied,
      fullyPaidCount: ordersFullyPaid.length,
      notesApplied: paymentRecords.length,
    });
  } catch (error) {
    console.error("Error al registrar abono:", error);
    return NextResponse.json(
      { error: "Error al registrar el abono" },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile, verifyManagerPin } from "@/lib/auth";
import { logOrderAction } from "@/lib/services/orderAudit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/undo-payment
 * Reverts payment, resets order status to PENDING, and records adjustment.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = await getTenantContext();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason, pin } = body;

    let authorizedByName = profile.full_name || profile.role || "Admin";

    // Si el usuario es mesero, requiere validación de PIN de Administrador/Gerente
    if (profile.role === "WAITER") {
      if (!pin) {
        return NextResponse.json(
          { error: "Se requiere PIN de Gerencia para autorizar la reapertura" },
          { status: 403 }
        );
      }
      const manager = await verifyManagerPin(tenant.id, String(pin).trim());
      if (!manager) {
        return NextResponse.json(
          { error: "PIN de autorización incorrecto" },
          { status: 401 }
        );
      }
      authorizedByName = manager.full_name || manager.role;
    } else if (profile.role !== "ADMIN" && profile.role !== "MANAGER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const supabase = await createClient();

    // 1. Get order details before any changes
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*, payments(*)")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const previousStatus = order.status;

    // 2. Delete payments associated with the order (scoped to tenant via order ownership)
    const { error: paymentDeleteError } = await supabase
      .from("payments")
      .delete()
      .eq("order_id", id)
      .eq("tenant_id", tenant.id);

    if (paymentDeleteError) throw paymentDeleteError;

    // 3. Update order status back to PENDING
    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        status: "PENDING",
        estado_cierre: "ABIERTA",
        corte_id: null,
        closed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (orderUpdateError) throw orderUpdateError;

    // 4. Log the adjustment with authorized manager
    const formattedReason = reason
      ? `${reason} (Autorizado por ${authorizedByName})`
      : `Reapertura de cuenta (Autorizado por ${authorizedByName})`;

    const { error: logError } = await supabase
      .from("order_adjustments")
      .insert({
        order_id: id,
        tenant_id: tenant.id,
        previous_status: previousStatus,
        new_status: "PENDING",
        reason: formattedReason,
      });

    if (logError) {
      console.error("Error logging order adjustment:", logError);
    }

    await logOrderAction({
      orderId: id,
      tenantId: tenant.id,
      user: profile,
      actionType: "REOPENED",
      details: {
        reason: formattedReason,
        authorizedBy: authorizedByName,
        previousStatus,
      },
      notifyCritical: true,
    });

    return NextResponse.json({ order: updatedOrder, success: true });
  } catch (error) {
    console.error("Error undoing payment:", error);
    return NextResponse.json(
      { error: "Error al deshacer pago" },
      { status: 500 }
    );
  }
}

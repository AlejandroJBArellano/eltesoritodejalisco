import { createClient } from "@/lib/supabase/server";
import type { CreateOrderRequest } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import {
  deductInventoryForOrder,
  reverseInventoryForOrder,
} from "@/lib/services/inventory";
import { logOrderAction } from "@/lib/services/orderAudit";
import {
  CustomizationError,
  resolveOrderItems,
  tenantDiscountIncludesModifiers,
  toRpcItem,
  type OrderItemInput,
} from "@/lib/customization/server";

/**
 * GET /api/orders
 * Retrieve all orders or filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const posParam = searchParams.get("pos");

    const profile = await getProfile();
    if (profile?.role === "WAITER" && posParam !== "true") {
      return NextResponse.json(
        {
          error: "No autorizado para consultar el historial general de órdenes",
        },
        { status: 403 },
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // POS view uses a narrower select — only columns read by mapOrderData
    const selectFields =
      posParam === "true"
        ? `
          id, order_number, customer_id, source, status, table, notes,
          subtotal, tax, total, created_at, updated_at, completed_at,
          corte_id, estado_cierre, operational_date, pickup_time,
          order_items (
            id, order_id, menu_item_id, quantity, unit_price, notes, status,
            tiempo_preparacion_segundos, created_at,
            base_unit_price, discount_base_price, customization_modified_at,
            order_item_options ( option_id, group_id, group_name, option_name, quantity, unit_price, group_sort, option_sort ),
            menu_items ( id, name, price, image_url, is_available )
          ),
          payments ( id, order_id, method, amount, received_amount, change, tip_amount, tip_payment_method, tip_terminal_id, terminal_id, terminal_name, terminal_commission_rate, terminal_commission_amount, created_at ),
          customer:customers ( id, name, email, phone )
        `
        : `
          *,
          order_items (
            *,
            order_item_options ( option_id, group_id, group_name, option_name, quantity, unit_price, group_sort, option_sort ),
            menu_items (*)
          ),
          payments (*),
          customer:customers (*)
        `;

    let query = supabase
      .from("orders")
      .select(selectFields)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (statusParam) {
      const statuses = statusParam.split(",");
      query = query.in("status", statuses);
    }

    if (posParam === "true") {
      const { data: latestCut } = await supabase
        .from("daily_cuts")
        .select("id, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestCut?.created_at) {
        query = query.or(
          `created_at.gt.${latestCut.created_at},and(corte_id.is.null,estado_cierre.neq.ARCHIVADA)`,
        );
      } else {
        query = query.or("corte_id.is.null,estado_cierre.neq.ARCHIVADA");
      }
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/orders
 * Create a new order via Supabase RPC (single round-trip for all writes)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest & { pickupTime?: string } =
      await request.json();
    const {
      customerId,
      source,
      table,
      notes,
      orderItems,
      pickupTime,
      discountType,
      discountValue,
      discountReason,
    } = body;

    if (!source) {
      return NextResponse.json(
        { error: "Order source is required" },
        { status: 400 },
      );
    }

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: "At least one order item is required" },
        { status: 400 },
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // 0. Validar personalización y calcular precios en el servidor.
    //    El precio que mande el cliente nunca se usa.
    const resolvedItems = await resolveOrderItems(
      tenant.id,
      orderItems.map(
        (i): OrderItemInput => ({
          menuItemId: i.menuItemId,
          quantity: Number(i.quantity),
          notes: i.notes || null,
          selections: i.selections || [],
          discountType: i.discountType || null,
          discountValue: i.discountValue ? Number(i.discountValue) : null,
          discountScope: i.discountScope || "ROW",
          discountReason: i.discountReason || null,
        }),
      ),
      { includeModifiersInDiscount: tenantDiscountIncludesModifiers(tenant) },
    );

    // 1. Create order + items (+ snapshot de opciones) in a single atomic RPC call.
    //    The SQL function generates the order_number and returns the full nested order object.
    const { data: fullOrder, error: rpcError } = await supabase.rpc(
      "create_order_with_items",
      {
        p_tenant_id: tenant.id,
        p_customer_id: customerId || null,
        p_source: source,
        p_table: table || null,
        p_notes: notes || null,
        p_items: resolvedItems.map(toRpcItem),
        p_pickup_time: pickupTime ? new Date(pickupTime).toISOString() : null,
        p_discount_type: discountType || null,
        p_discount_value: discountValue ? Number(discountValue) : null,
        p_discount_reason: discountReason || null,
      },
    );

    if (rpcError) throw rpcError;

    // 2. El producto base se descuenta dentro del RPC; las opciones aquí.
    if (
      resolvedItems.some((item) =>
        item.options.some((o) => o.inventory.length > 0),
      )
    ) {
      await deductInventoryForOrder(fullOrder.id);
    }

    const profile = await getProfile();
    const createdItems = Array.isArray(fullOrder?.order_items)
      ? fullOrder.order_items
      : [];
    const itemsSummary = createdItems
      .map((item: Record<string, unknown>) => {
        const menuItem = item?.menu_items as { name?: string } | undefined;
        const name = menuItem?.name || "Producto";
        const qty = (item.quantity as number | undefined) || 1;
        return `${name} x${qty}`;
      })
      .join(", ");

    await logOrderAction({
      orderId: fullOrder.id,
      tenantId: tenant.id,
      user: profile,
      actionType: "CREATED",
      details: {
        summary: itemsSummary || undefined,
        orderNumber: fullOrder.order_number,
        table: table || null,
        source,
        itemsCount: orderItems.length,
        total: fullOrder.total,
      },
    });

    return NextResponse.json({ order: fullOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomizationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/orders
 * Delete an order
 */
export async function DELETE(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    await logOrderAction({
      orderId: id,
      tenantId: tenant.id,
      user: profile,
      actionType: "CANCELLED",
      details: { reason: "Orden cancelada vía panel de administración" },
      notifyCritical: true,
    });

    // Revert inventory before deleting order
    await reverseInventoryForOrder(id);

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 },
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import { getCurrentCDMXDate, getCurrentCDMXDay } from "@/lib/utils";
import type { CreateOrderRequest } from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

/**
 * GET /api/orders
 * Retrieve all orders or filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");

    const tenant = await getTenantContext();
    const supabase = await createClient();
    let query = supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          menu_items (*)
        ),
        payments (*),
        customer:customers (*)
      `,
      )
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (statusParam) {
      const statuses = statusParam.split(",");
      query = query.in("status", statuses);
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
    const { customerId, source, table, notes, orderItems, pickupTime } = body;

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

    // 1. Create order + items in a single atomic RPC call
    const { data: orderId, error: rpcError } = await supabase.rpc(
      "create_order_with_items",
      {
        p_tenant_id: tenant.id,
        p_customer_id: customerId || null,
        p_source: source,
        p_table: table || null,
        p_notes: notes || null,
        p_items: orderItems.map((i) => ({
          menu_item_id: i.menuItemId,
          quantity: Number(i.quantity),
          notes: i.notes || null,
        })),
        p_pickup_time: pickupTime ? new Date(pickupTime).toISOString() : null,
      },
    );

    if (rpcError) throw rpcError;

    // 2. Fetch the full order with nested relations (single read)
    const { data: fullOrder, error: fetchError } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          menu_items (*)
        ),
        payments (*),
        customer:customers (*)
      `,
      )
      .eq("id", orderId)
      .eq("tenant_id", tenant.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ order: fullOrder }, { status: 201 });
  } catch (error) {
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
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();
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

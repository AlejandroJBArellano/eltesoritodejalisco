import { createClient } from "@/lib/supabase/server";
import { getCurrentCDMXDate, getCurrentCDMXDay } from "@/lib/utils";
import type { CreateOrderRequest } from "@/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/orders
 * Retrieve all orders or filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");

    const supabase = await createClient();
    let query = supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        ),
        payments (*),
        customer:customers (*)
      `)
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
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const { customerId, source, table, notes, orderItems } = body;

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

    const supabase = await createClient();

    // Generate order number
    // Reset at the start of the day or after the most recent daily cut
    const todayStart = getCurrentCDMXDay() + "T00:00:00-06:00";
    const { data: latestCut } = await supabase
      .from("daily_cuts")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let query = supabase
      .from("orders")
      .select("order_number")
      .order("created_at", { ascending: false });

    const filterDate = latestCut && latestCut.created_at > todayStart 
      ? latestCut.created_at 
      : todayStart;

    query = query.gt("created_at", filterDate);

    const { data: lastOrder } = await query.limit(1).maybeSingle();

    let nextSeq = 1;
    if (lastOrder && lastOrder.order_number) {
      const parts = lastOrder.order_number.split('-');
      const lastSeqStr = parts[parts.length - 1];
      nextSeq = parseInt(lastSeqStr, 10) + 1;
    }

    const todayStr = getCurrentCDMXDay().replace(/-/g, "").slice(2);
    const nextNumber = `${todayStr}-${nextSeq.toString().padStart(3, "0")}`;

    // Calculate order totals
    let subtotal = 0;
    const itemsWithPrices = [];

    for (const item of orderItems) {
      if (!item.menuItemId) {
        throw new Error("Menu item is required");
      }

      const parsedQuantity = Number(item.quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      const { data: menuItem, error: menuError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", item.menuItemId)
        .single();

      if (menuError || !menuItem)
        throw new Error(`Menu item ${item.menuItemId} not found`);

      const itemTotal = menuItem.price * parsedQuantity;
      subtotal += itemTotal;

      itemsWithPrices.push({
        menu_item_id: item.menuItemId,
        quantity: Math.round(parsedQuantity),
        unit_price: menuItem.price,
        notes: item.notes || null,
      });
    }

    const tax = subtotal * 0;
    const total = subtotal + tax;

    const orderId = crypto.randomUUID();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        id: orderId,
        order_number: nextNumber,
        customer_id: customerId,
        source,
        table,
        notes,
        subtotal,
        tax,
        total,
        updated_at: getCurrentCDMXDate()
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(
        itemsWithPrices.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
          order_id: order.id,
        }))
      );

    if (itemsError) throw itemsError;

    // Fetch full order for response
    const { data: fullOrder } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        ),
        payments (*),
        customer:customers (*)
      `)
      .eq("id", order.id)
      .single();

    // If customer exists, update loyalty points
    if (customerId) {
      const pointsEarned = Math.floor(total / 10);
      
      const { data: customer } = await supabase
        .from("customers")
        .select("loyalty_points, total_spend")
        .eq("id", customerId)
        .single();

      if (customer) {
        await supabase
          .from("customers")
          .update({
            loyalty_points: (customer.loyalty_points || 0) + pointsEarned,
            total_spend: (customer.total_spend || 0) + total,
          })
          .eq("id", customerId);
      }
    }

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

    const supabase = await createClient();
    const { error } = await supabase.from("orders").delete().eq("id", id);

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

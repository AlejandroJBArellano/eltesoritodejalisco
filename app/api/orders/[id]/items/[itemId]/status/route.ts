import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

const parseDbTimestamp = (timestamp: string): number => {
  const normalizedTimestamp =
    timestamp.includes("Z") || timestamp.includes("+")
      ? timestamp
      : `${timestamp.replace(" ", "T")}Z`;

  return new Date(normalizedTimestamp).getTime();
};

/**
 * PATCH /api/orders/[id]/items/[itemId]/status
 * Update status for a single order item and record prep time.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId, itemId } = await params;
    const { status } = (await request.json()) as { status?: string };

    if (!status) {
      return NextResponse.json(
        { error: "Item status is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, created_at, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { data: orderItem, error: itemError } = await supabase
      .from("order_items")
      .select("id, status")
      .eq("id", itemId)
      .eq("order_id", orderId)
      .single();

    if (itemError || !orderItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updateItemData: Record<string, string | number | null> = { status };

    if (status === "READY") {
      const nowMs = Date.now();
      const createdAtMs = parseDbTimestamp(order.created_at);
      const prepSeconds = Number.isNaN(createdAtMs)
        ? 0
        : Math.max(0, Math.floor((nowMs - createdAtMs) / 1000));

      updateItemData.tiempo_preparacion_segundos = prepSeconds;
    }

    const { data: updatedItem, error: updateItemError } = await supabase
      .from("order_items")
      .update(updateItemData)
      .eq("id", itemId)
      .eq("order_id", orderId)
      .select("id, status, tiempo_preparacion_segundos")
      .single();

    if (updateItemError) throw updateItemError;

    // We no longer automatically update the order status here.
    // The frontend will call a separate endpoint to close the order
    // once all items are marked as READY.

    return NextResponse.json({
      item: {
        id: updatedItem.id,
        status: updatedItem.status,
        preparationTimeSeconds: updatedItem.tiempo_preparacion_segundos,
      },
      orderStatus: order.status,
    });
  } catch (error) {
    console.error("Error updating order item status:", error);
    return NextResponse.json(
      { error: "Failed to update order item status" },
      { status: 500 },
    );
  }
}

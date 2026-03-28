import { createClient } from "@/lib/supabase/server";
import { reverseInventoryForOrder } from "@/lib/services/inventory";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/undo-payment
 * Reverts payment, resets order status to PENDING, and reverses inventory
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { reason } = await request.json();

    const supabase = await createClient();

    // 1. Get order details before any changes
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*, payments(*)")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const previousStatus = order.status;

    // 2. Delete payments associated with the order
    const { error: paymentDeleteError } = await supabase
      .from("payments")
      .delete()
      .eq("order_id", id);

    if (paymentDeleteError) throw paymentDeleteError;

    // 3. Update order status back to PENDING (or previous status if preferred)
    // We'll use PENDING to allow editing
    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from("orders")
      .update({ status: "PENDING", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (orderUpdateError) throw orderUpdateError;

    // 4. Reverse inventory deductions
    try {
      await reverseInventoryForOrder(id);
    } catch (reverseError) {
      console.error("Error reversing inventory:", reverseError);
      // Log but don't fail the whole undo process
    }

    // 5. Log the adjustment
    const { error: logError } = await supabase
      .from("order_adjustments")
      .insert({
        order_id: id,
        previous_status: previousStatus,
        new_status: "PENDING",
        reason: reason || "Undo Payment (3 min window)",
      });

    if (logError) {
      console.error("Error logging order adjustment:", logError);
    }

    return NextResponse.json({ order: updatedOrder, success: true });
  } catch (error) {
    console.error("Error undoing payment:", error);
    return NextResponse.json(
      { error: "Failed to undo payment" },
      { status: 500 }
    );
  }
}

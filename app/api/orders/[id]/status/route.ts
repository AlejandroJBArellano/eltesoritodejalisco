import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/orders/[id]/status
 * Update order status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    const updateData: any = { status };

    // If order is completed, set completion timestamp
    if (status === "DELIVERED" || status === "PAID") {
      updateData.completed_at = new Date().toISOString();
    }

    const supabase = await createClient();
    const { data: order, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 },
    );
  }
}

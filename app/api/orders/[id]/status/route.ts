import { createClient } from "@/lib/supabase/server";
import { getCurrentCDMXDate } from "@/lib/utils";
import { getTenantContext } from "@/lib/tenant";
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

    const updateData: {
      status: string;
      completed_at?: string;
    } = { status };

    // If order is completed or uncollected, set completion timestamp
    if (
      status === "DELIVERED" ||
      status === "PAID" ||
      status === "UNCOLLECTED"
    ) {
      updateData.completed_at = getCurrentCDMXDate();
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // Sync order items status for items that are not already delivered
    // Filter by tenant_id via order to prevent cross-tenant mutations
    await supabase
      .from("order_items")
      .update({ status })
      .eq("order_id", id)
      .eq("tenant_id", tenant.id)
      .neq("status", "DELIVERED");

    const { data: order, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select(
        `
        *,
        order_items (
          *,
          menu_items (*)
        )
      `,
      )
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

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: batchId } = await params;
    const endedAt = new Date();

    const supabase = await createClient();

    // 1. Get the batch details
    const { data: batch, error: batchError } = await supabase
      .from("smart_batches")
      .select("*, ingredient:ingredients(*)")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (!batch.is_active) {
      return NextResponse.json(
        { error: "Batch is already closed" },
        { status: 400 },
      );
    }

    // 2. Find orders during this period
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (
            *,
            recipe_items (*)
          )
        )
      `)
      .gte("created_at", batch.started_at)
      .lte("created_at", endedAt.toISOString())
      .neq("status", "CANCELLED");

    if (ordersError) throw ordersError;

    // 3. Calculate Yield (How many items consumed this ingredient)
    const yieldSummary: Record<string, number> = {};
    let totalItemsServed = 0;

    for (const order of (orders || [])) {
      for (const item of (order as any).order_items) {
        // Check if this menu item uses the ingredient of the batch
        const usesIngredient = item.menu_items?.recipe_items.some(
          (ri: any) => ri.ingredient_id === batch.ingredient_id,
        );

        if (usesIngredient && item.menu_items) {
          const itemName = item.menu_items.name;
          const quantity = item.quantity;

          if (!yieldSummary[itemName]) {
            yieldSummary[itemName] = 0;
          }
          yieldSummary[itemName] += quantity;
          totalItemsServed += quantity;
        }
      }
    }

    // 4. Close the batch
    const { data: updatedBatch, error: updateError } = await supabase
      .from("smart_batches")
      .update({
        is_active: false,
        ended_at: endedAt.toISOString(),
        final_yield: yieldSummary,
      })
      .eq("id", batchId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      batch: updatedBatch,
      summary: yieldSummary,
      totalItems: totalItemsServed,
    });
  } catch (error) {
    console.error("Error finishing smart batch:", error);
    return NextResponse.json(
      { error: "Failed to finish batch" },
      { status: 500 },
    );
  }
}

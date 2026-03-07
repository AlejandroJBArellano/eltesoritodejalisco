import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const TAX_RATE = 0;

/**
 * PUT /api/orders/:id
 * Replace the full item list of an existing order.
 * Accepts { items: [{ id: string, quantity: number }] }.
 * Items missing from the list (or with quantity ≤ 0) are deleted.
 * Order totals are recalculated automatically.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify the order exists
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Separate items to keep (quantity > 0) from items to delete (quantity ≤ 0)
    const itemsToKeep = items.filter(
      (i: { id: string; quantity: number }) => i.quantity > 0,
    );
    const keepIds = itemsToKeep.map((i: { id: string }) => i.id);

    // Fetch current order items
    const { data: currentItems } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", id);

    const currentIds = (currentItems || []).map((i: { id: string }) => i.id);

    // Delete items that are no longer in the list
    const idsToDelete = currentIds.filter((cid: string) => !keepIds.includes(cid));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .in("id", idsToDelete);
      if (deleteError) throw deleteError;
    }

    // Update quantities for items that remain
    for (const item of itemsToKeep) {
      const { error: updateError } = await supabase
        .from("order_items")
        .update({ quantity: item.quantity })
        .eq("id", item.id)
        .eq("order_id", id);
      if (updateError) throw updateError;
    }

    // Recalculate order totals from what's left in the database
    const { data: remainingItems } = await supabase
      .from("order_items")
      .select("unit_price, quantity")
      .eq("order_id", id);

    const newSubtotal = (remainingItems || []).reduce(
      (sum: number, item: { unit_price: number; quantity: number }) =>
        sum + item.unit_price * item.quantity,
      0,
    );
    const newTax = newSubtotal * TAX_RATE;
    const newTotal = newSubtotal + newTax;

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update({
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        order_items (
          *,
          menu_items (*)
        ),
        customer:customers (*)
      `,
      )
      .single();

    if (updateOrderError) throw updateOrderError;

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Error modifying order:", error);
    return NextResponse.json(
      { error: "Failed to modify order" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { orderItems } = body;

    // Validate request body
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json({ error: "No items to add" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if order exists
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let additionalSubtotal = 0;
    const newItemsData = [];

    // Process each new item
    for (const item of orderItems) {
      if (!item.menuItemId) {
        return NextResponse.json(
          { error: "Menu item ID is required for all items" },
          { status: 400 },
        );
      }

      const { data: menuItem, error: menuError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", item.menuItemId)
        .single();

      if (menuError || !menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found` },
          { status: 400 },
        );
      }

      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for item ${menuItem.name}` },
          { status: 400 },
        );
      }

      const itemTotal = menuItem.price * quantity;
      additionalSubtotal += itemTotal;

      newItemsData.push({
        id: crypto.randomUUID(),
        order_id: id,
        menu_item_id: item.menuItemId,
        quantity: quantity,
        unit_price: menuItem.price,
        notes: item.notes || "",
        status: "PENDING",
      });
    }

    // Create new order items in database
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(newItemsData);

    if (itemsError) throw itemsError;

    const additionalTax = additionalSubtotal * 0;
    const additionalTotal = additionalSubtotal + additionalTax;

    const orderUpdate: any = {
      subtotal: (order.subtotal || 0) + additionalSubtotal,
      tax: (order.tax || 0) + additionalTax,
      total: (order.total || 0) + additionalTotal,
      updated_at: new Date().toISOString(),
    };

    if (["DELIVERED", "READY", "COMPLETED"].includes(order.status)) {
      orderUpdate.status = "PENDING";
    }

    // Update order totals
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(orderUpdate)
      .eq("id", id)
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        ),
        customer:customers (*)
      `)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/orders/:id
 * Permanently delete a specific order (and its items via cascade).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

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

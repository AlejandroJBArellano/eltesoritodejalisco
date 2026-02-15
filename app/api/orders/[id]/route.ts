import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
        order_id: id,
        menu_item_id: item.menuItemId,
        quantity: quantity,
        unit_price: menuItem.price,
        notes: item.notes || "",
      });
    }

    // Create new order items in database
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(newItemsData);

    if (itemsError) throw itemsError;

    const additionalTax = additionalSubtotal * 0;
    const additionalTotal = additionalSubtotal + additionalTax;

    // Update order totals
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        subtotal: (order.subtotal || 0) + additionalSubtotal,
        tax: (order.tax || 0) + additionalTax,
        total: (order.total || 0) + additionalTotal,
        updated_at: new Date().toISOString(),
      })
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

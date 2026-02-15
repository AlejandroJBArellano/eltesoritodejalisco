import { prisma } from "@/lib/prisma";
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

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let additionalSubtotal = 0;
    const newItemsData = [];

    // Process each new item
    for (const item of orderItems) {
      if (!item.menuItemId) {
        // Find menuItemId in prisma to get price
        // Actually we need to fetch menuItem here if not provided in body fully?
        // Let's assume body has menuItemId and quantity
        return NextResponse.json(
          { error: "Menu item ID is required for all items" },
          { status: 400 },
        );
      }

      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem) {
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
        orderId: id,
        menuItemId: item.menuItemId,
        quantity: quantity,
        unitPrice: menuItem.price,
        notes: item.notes || "",
      });
    }

    // Create new order items in database
    await prisma.orderItem.createMany({
      data: newItemsData,
    });

    const additionalTax = additionalSubtotal * 0; // Tax rate is 0 currently
    const additionalTotal = additionalSubtotal + additionalTax;

    // Update order totals
    // Use increment to be atomic
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        subtotal: { increment: additionalSubtotal },
        tax: { increment: additionalTax },
        total: { increment: additionalTotal },
        updatedAt: new Date(),
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        customer: true,
      },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}

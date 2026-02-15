// TesoritoOS - Orders API Route
// Handles order creation, updates, and retrieval

import { prisma } from "@/lib/prisma";
import type { CreateOrderRequest } from "@/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/orders
 * Retrieve all orders or filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const orders = await prisma.order.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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

    // Generate order number (simple increment, in production use a more robust system)
    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: "desc" },
    });

    const nextNumber = lastOrder
      ? (parseInt(lastOrder.orderNumber) + 1).toString().padStart(3, "0")
      : "001";

    // Calculate order totals
    let subtotal = 0;
    const itemsWithPrices = await Promise.all(
      orderItems.map(async (item) => {
        if (!item.menuItemId) {
          throw new Error("Menu item is required");
        }

        const parsedQuantity = Number(item.quantity);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
          throw new Error("Quantity must be greater than 0");
        }

        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });
        if (!menuItem)
          throw new Error(`Menu item ${item.menuItemId} not found`);

        const itemTotal = menuItem.price * parsedQuantity;
        subtotal += itemTotal;

        return {
          ...item,
          quantity: Math.round(parsedQuantity),
          unitPrice: menuItem.price,
        };
      }),
    );

    const tax = subtotal * 0; // 0.16; // 16% IVA (Temporarily disabled)
    const total = subtotal + tax;

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber: nextNumber,
        customerId,
        source,
        table,
        notes,
        subtotal,
        tax,
        total,
        orderItems: {
          create: itemsWithPrices,
        },
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

    // If customer exists, update loyalty points
    if (customerId) {
      const pointsEarned = Math.floor(total / 10); // $10 = 1 point
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: { increment: pointsEarned },
          totalSpend: { increment: total },
        },
      });
    }

    return NextResponse.json({ order }, { status: 201 });
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

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 },
    );
  }
}

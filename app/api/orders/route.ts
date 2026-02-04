// TesoritoOS - Orders API Route
// Handles order creation, updates, and retrieval

import type { CreateOrderRequest } from "@/types";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

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
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });
        if (!menuItem)
          throw new Error(`Menu item ${item.menuItemId} not found`);

        const itemTotal = menuItem.price * item.quantity;
        subtotal += itemTotal;

        return {
          ...item,
          unitPrice: menuItem.price,
        };
      }),
    );

    const tax = subtotal * 0.16; // 16% IVA
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

// TesoritoOS - Update Order Status API
// Handles order status changes

import { prisma } from "@/lib/prisma";
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
      updateData.completedAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 },
    );
  }
}

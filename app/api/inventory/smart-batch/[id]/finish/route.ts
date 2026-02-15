import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const batchId = params.id;
    const endedAt = new Date(); // Use current time as end time or pass it via body if needed (usually just "now")

    // 1. Get the batch details
    const batch = await prisma.smartBatch.findUnique({
      where: { id: batchId },
      include: {
        ingredient: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (!batch.isActive) {
      return NextResponse.json(
        { error: "Batch is already closed" },
        { status: 400 },
      );
    }

    // 2. Find orders during this period
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: batch.startedAt,
          lte: endedAt,
        },
        status: {
          not: "CANCELLED", // Exclude cancelled orders
        },
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              include: {
                recipeItems: true, // Need to check if this item uses the ingredient
              },
            },
          },
        },
      },
    });

    // 3. Calculate Yield (How many items consumed this ingredient)
    const yieldSummary: Record<string, number> = {};
    let totalItemsServed = 0;

    for (const order of orders) {
      for (const item of order.orderItems) {
        // Check if this menu item uses the ingredient of the batch
        const usesIngredient = item.menuItem?.recipeItems.some(
          (ri) => ri.ingredientId === batch.ingredientId,
        );

        if (usesIngredient && item.menuItem) {
          const itemName = item.menuItem.name;
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
    const updatedBatch = await prisma.smartBatch.update({
      where: { id: batchId },
      data: {
        isActive: false,
        endedAt: endedAt,
        finalYield: yieldSummary,
      },
    });

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

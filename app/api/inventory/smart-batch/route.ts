import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: Get the active batch for a specific ingredient
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ingredientId = searchParams.get("ingredientId");

  if (!ingredientId) {
    return NextResponse.json(
      { error: "Ingredient ID is required" },
      { status: 400 },
    );
  }

  try {
    const activeBatch = await prisma.smartBatch.findFirst({
      where: {
        ingredientId,
        isActive: true,
      },
      include: {
        ingredient: true,
      },
    });

    return NextResponse.json({ activeBatch });
  } catch (error) {
    console.error("Error fetching active batch:", error);
    return NextResponse.json(
      { error: "Failed to fetch active batch" },
      { status: 500 },
    );
  }
}

// POST: Start a new smart batch
export async function POST(request: NextRequest) {
  try {
    const { ingredientId, name } = await request.json();

    if (!ingredientId) {
      return NextResponse.json(
        { error: "Ingredient ID is required" },
        { status: 400 },
      );
    }

    // Close any existing active batches for this ingredient
    await prisma.smartBatch.updateMany({
      where: {
        ingredientId,
        isActive: true,
      },
      data: {
        isActive: false,
        endedAt: new Date(), // Just close them without calc if force opened
      },
    });

    const newBatch = await prisma.smartBatch.create({
      data: {
        ingredientId,
        name: name || "Topper Standard",
        isActive: true, // Started now
      },
    });

    return NextResponse.json(newBatch, { status: 201 });
  } catch (error) {
    console.error("Error creating smart batch:", error);
    return NextResponse.json(
      { error: "Failed to create smart batch" },
      { status: 500 },
    );
  }
}

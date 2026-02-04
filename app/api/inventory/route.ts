// TesoritoOS - Inventory Management API
// Handles ingredient CRUD and stock adjustments

import {
  adjustIngredientStock,
  checkLowStockIngredients,
} from "@/lib/services/inventory";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

/**
 * GET /api/inventory
 * Get all ingredients, optionally filter by low stock
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lowStock = searchParams.get("lowStock") === "true";

    if (lowStock) {
      const ingredients = await checkLowStockIngredients();
      return NextResponse.json({ ingredients });
    }

    const ingredients = await prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      include: {
        stockAdjustments: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredients" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/inventory
 * Create a new ingredient
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, unit, currentStock, minimumStock, costPerUnit } = body;

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        currentStock,
        minimumStock: minimumStock || 0,
        costPerUnit,
      },
    });

    return NextResponse.json({ ingredient }, { status: 201 });
  } catch (error) {
    console.error("Error creating ingredient:", error);
    return NextResponse.json(
      { error: "Failed to create ingredient" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/inventory/adjust
 * Manually adjust ingredient stock
 */
export async function PATCH(request: NextRequest) {
  try {
    const { ingredientId, adjustment, reason, userId } = await request.json();

    if (!ingredientId || adjustment === undefined) {
      return NextResponse.json(
        { error: "Ingredient ID and adjustment are required" },
        { status: 400 },
      );
    }

    const result = await adjustIngredientStock(
      ingredientId,
      adjustment,
      reason,
      userId,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 },
    );
  }
}

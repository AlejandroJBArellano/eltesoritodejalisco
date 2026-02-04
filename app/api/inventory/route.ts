// TesoritoOS - Inventory Management API
// Handles ingredient CRUD and stock adjustments

import { prisma } from "@/lib/prisma";
import {
  adjustIngredientStock,
  checkLowStockIngredients,
} from "@/lib/services/inventory";
import { NextRequest, NextResponse } from "next/server";

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

    if (!name || !unit) {
      return NextResponse.json(
        { error: "Name and unit are required" },
        { status: 400 },
      );
    }

    const parsedCurrentStock = Number(currentStock);
    const parsedMinimumStock = Number(minimumStock ?? 0);
    const parsedCostPerUnit =
      costPerUnit === undefined || costPerUnit === null || costPerUnit === ""
        ? undefined
        : Number(costPerUnit);

    if (!Number.isFinite(parsedCurrentStock) || parsedCurrentStock < 0) {
      return NextResponse.json(
        { error: "Current stock must be a non-negative number" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(parsedMinimumStock) || parsedMinimumStock < 0) {
      return NextResponse.json(
        { error: "Minimum stock must be a non-negative number" },
        { status: 400 },
      );
    }

    if (
      parsedCostPerUnit !== undefined &&
      (!Number.isFinite(parsedCostPerUnit) || parsedCostPerUnit < 0)
    ) {
      return NextResponse.json(
        { error: "Cost per unit must be a non-negative number" },
        { status: 400 },
      );
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        currentStock: parsedCurrentStock,
        minimumStock: parsedMinimumStock,
        costPerUnit: parsedCostPerUnit,
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
      const errorMessage =
        "error" in result ? result.error : "Invalid adjustment";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
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

/**
 * PUT /api/inventory
 * Update an ingredient
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, unit, currentStock, minimumStock, costPerUnit } = body;

    if (!id || !name || !unit) {
      return NextResponse.json(
        { error: "ID, name, and unit are required" },
        { status: 400 },
      );
    }

    const parsedCurrentStock = Number(currentStock);
    const parsedMinimumStock = Number(minimumStock ?? 0);
    const parsedCostPerUnit =
      costPerUnit === undefined || costPerUnit === null || costPerUnit === ""
        ? undefined
        : Number(costPerUnit);

    if (!Number.isFinite(parsedCurrentStock) || parsedCurrentStock < 0) {
      return NextResponse.json(
        { error: "Current stock must be a non-negative number" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(parsedMinimumStock) || parsedMinimumStock < 0) {
      return NextResponse.json(
        { error: "Minimum stock must be a non-negative number" },
        { status: 400 },
      );
    }

    if (
      parsedCostPerUnit !== undefined &&
      (!Number.isFinite(parsedCostPerUnit) || parsedCostPerUnit < 0)
    ) {
      return NextResponse.json(
        { error: "Cost per unit must be a non-negative number" },
        { status: 400 },
      );
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name,
        unit,
        currentStock: parsedCurrentStock,
        minimumStock: parsedMinimumStock,
        costPerUnit: parsedCostPerUnit,
      },
    });

    return NextResponse.json({ ingredient });
  } catch (error) {
    console.error("Error updating ingredient:", error);
    return NextResponse.json(
      { error: "Failed to update ingredient" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/inventory
 * Delete an ingredient
 */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Ingredient ID is required" },
        { status: 400 },
      );
    }

    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    return NextResponse.json(
      { error: "Failed to delete ingredient" },
      { status: 500 },
    );
  }
}

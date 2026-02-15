// TesoritoOS - Inventory Management API
// Handles ingredient CRUD and stock adjustments

import { createClient } from "@/lib/supabase/server";
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

    const supabase = await createClient();
    const { data: ingredients, error } = await supabase
      .from("ingredients")
      .select(`
        *,
        stock_adjustments (
          *
        )
      `)
      .order("name", { ascending: true });

    if (error) throw error;

    // Prisma's "take: 5" for nested stockAdjustments is hard to do in a single Supabase query
    // without complex logic. For simplicity, we might just return all or handle it in client.
    // However, if we want exactly 5:
    const ingredientsWithLimitedAdjustments = (ingredients || []).map((ing: any) => ({
      ...ing,
      stockAdjustments: (ing.stock_adjustments || [])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    }));

    return NextResponse.json({ ingredients: ingredientsWithLimitedAdjustments });
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
        ? null
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
      parsedCostPerUnit !== null &&
      (!Number.isFinite(parsedCostPerUnit) || parsedCostPerUnit < 0)
    ) {
      return NextResponse.json(
        { error: "Cost per unit must be a non-negative number" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: ingredient, error } = await supabase
      .from("ingredients")
      .insert({
        name,
        unit,
        current_stock: parsedCurrentStock,
        minimum_stock: parsedMinimumStock,
        cost_per_unit: parsedCostPerUnit,
      })
      .select()
      .single();

    if (error) throw error;

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
        ? null
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
      parsedCostPerUnit !== null &&
      (!Number.isFinite(parsedCostPerUnit) || parsedCostPerUnit < 0)
    ) {
      return NextResponse.json(
        { error: "Cost per unit must be a non-negative number" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: ingredient, error } = await supabase
      .from("ingredients")
      .update({
        name,
        unit,
        current_stock: parsedCurrentStock,
        minimum_stock: parsedMinimumStock,
        cost_per_unit: parsedCostPerUnit,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

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

    const supabase = await createClient();
    const { error } = await supabase.from("ingredients").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    return NextResponse.json(
      { error: "Failed to delete ingredient" },
      { status: 500 },
    );
  }
}

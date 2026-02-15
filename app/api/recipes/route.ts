// TesoritoOS - Recipes API
// Handles recipe items for menu products

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/recipes?menuItemId=...
 * Get recipe items for a menu item
 */
export async function GET(request: NextRequest) {
  try {
    const menuItemId = request.nextUrl.searchParams.get("menuItemId");

    if (!menuItemId) {
      return NextResponse.json(
        { error: "menuItemId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: recipeItems, error } = await supabase
      .from("recipe_items")
      .select("*, ingredient:ingredients(*)")
      .eq("menu_item_id", menuItemId);

    if (error) throw error;

    return NextResponse.json({ recipeItems });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recipes
 * Create a recipe item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { menuItemId, ingredientId, quantityRequired } = body;

    if (!menuItemId || !ingredientId) {
      return NextResponse.json(
        { error: "menuItemId and ingredientId are required" },
        { status: 400 },
      );
    }

    const parsedQuantity = Number(quantityRequired);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json(
        { error: "quantityRequired must be greater than 0" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: recipeItem, error } = await supabase
      .from("recipe_items")
      .insert({
        menu_item_id: menuItemId,
        ingredient_id: ingredientId,
        quantity_required: parsedQuantity,
      })
      .select("*, ingredient:ingredients(*)")
      .single();

    if (error) throw error;

    return NextResponse.json({ recipeItem }, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/recipes
 * Update recipe item quantity
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, quantityRequired } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Recipe item ID is required" },
        { status: 400 },
      );
    }

    const parsedQuantity = Number(quantityRequired);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json(
        { error: "quantityRequired must be greater than 0" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: recipeItem, error } = await supabase
      .from("recipe_items")
      .update({ quantity_required: parsedQuantity })
      .eq("id", id)
      .select("*, ingredient:ingredients(*)")
      .single();

    if (error) throw error;

    return NextResponse.json({ recipeItem });
  } catch (error) {
    console.error("Error updating recipe:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/recipes
 * Delete a recipe item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Recipe item ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from("recipe_items").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 },
    );
  }
}

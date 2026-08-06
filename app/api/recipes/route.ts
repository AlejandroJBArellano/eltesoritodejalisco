// TesoritoOS - Recipes API
// Handles recipe items for menu products

import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";

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
      .select("*, ingredients(*)")
      .eq("menu_item_id", menuItemId);

    if (error) throw error;

    const formatted = (recipeItems || []).map((item: any) => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      ingredientId: item.ingredient_id,
      ingredientName: item.ingredients?.name || "Sin nombre",
      quantityRequired: item.quantity_required,
    }));

    return NextResponse.json({ recipeItems: formatted });
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
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
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

    const tenant = await getTenantContext();
    const supabase = await createClient();
    const { data: recipeItem, error } = await supabase
      .from("recipe_items")
      .insert({
        menu_item_id: menuItemId,
        ingredient_id: ingredientId,
        quantity_required: parsedQuantity,
        tenant_id: tenant.id,
      })
      .select("*, ingredients(*)")
      .single();

    if (error) throw error;

    const formatted = {
      id: recipeItem.id,
      menuItemId: recipeItem.menu_item_id,
      ingredientId: recipeItem.ingredient_id,
      ingredientName: recipeItem.ingredients?.name || "Sin nombre",
      quantityRequired: recipeItem.quantity_required,
    };

    return NextResponse.json({ recipeItem: formatted }, { status: 201 });
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
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
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
      .select("*, ingredients(*)")
      .single();

    if (error) throw error;

    const formatted = {
      id: recipeItem.id,
      menuItemId: recipeItem.menu_item_id,
      ingredientId: recipeItem.ingredient_id,
      ingredientName: recipeItem.ingredients?.name || "Sin nombre",
      quantityRequired: recipeItem.quantity_required,
    };

    return NextResponse.json({ recipeItem: formatted });
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
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
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

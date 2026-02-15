// TesoritoOS - Inventory Deduction Service
// Automatically deducts ingredients from stock when an order is completed

import type { InventoryDeductionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Deducts ingredients from inventory based on order items and their recipes
 * This function should be called when an order status changes to DELIVERED or PAID
 *
 * @param orderId - The ID of the order to process
 * @returns Result object with deduction details and any errors
 */
export async function deductInventoryForOrder(
  orderId: string,
): Promise<InventoryDeductionResult> {
  const result: InventoryDeductionResult = {
    success: true,
    deductions: [],
    errors: [],
  };

  try {
    const supabase = await createClient();

    // Fetch the order with all its items and recipe information
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (
            *,
            recipe_items (
              *,
              ingredients (*)
            )
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      result.success = false;
      result.errors = ["Order not found"];
      return result;
    }

    // Calculate total ingredient requirements
    const ingredientRequirements = new Map<
      string,
      { ingredient: any; totalRequired: number }
    >();

    for (const orderItem of (order as any).order_items) {
      const { menu_items: menuItem, quantity } = orderItem;

      if (!menuItem || !menuItem.recipe_items) continue;

      for (const recipeItem of menuItem.recipe_items) {
        const { ingredients: ingredient, quantity_required } = recipeItem;
        if (!ingredient) continue;
        
        const totalNeeded = quantity_required * quantity;

        if (ingredientRequirements.has(ingredient.id)) {
          const existing = ingredientRequirements.get(ingredient.id)!;
          existing.totalRequired += totalNeeded;
        } else {
          ingredientRequirements.set(ingredient.id, {
            ingredient,
            totalRequired: totalNeeded,
          });
        }
      }
    }

    // Process deductions
    for (const [
      ingredientId,
      { ingredient, totalRequired },
    ] of ingredientRequirements) {
      const previousStock = ingredient.current_stock;
      const newStock = previousStock - totalRequired;

      // Update the ingredient stock (allow negative)
      const { error: updateError } = await supabase
        .from("ingredients")
        .update({ current_stock: newStock })
        .eq("id", ingredientId);

      if (updateError) {
        result.success = false;
        result.errors?.push(`Failed to update stock for ${ingredient.name}`);
        continue;
      }

      // Log the deduction
      const { error: logError } = await supabase
        .from("stock_adjustments")
        .insert({
          ingredient_id: ingredient.id,
          adjustment: -totalRequired,
          reason: `Order deduction`,
          created_at: new Date().toISOString(),
        });

      if (logError) {
        console.error("Failed to log stock adjustment:", logError);
      }

      // Record the deduction
      result.deductions.push({
        ingredientId,
        ingredientName: ingredient.name,
        quantityDeducted: totalRequired,
        previousStock,
        newStock,
      });
    }

    return result;
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors?.push(`Failed to deduct inventory: ${errorMessage}`);
    return result;
  }
}

/**
 * Manually adjust ingredient stock (for purchases, corrections, or waste)
 *
 * @param ingredientId - The ID of the ingredient to adjust
 * @param adjustment - The amount to add (positive) or subtract (negative)
 * @param reason - Description of why the adjustment is being made
 * @param userId - Optional user ID who made the adjustment
 */
export async function adjustIngredientStock(
  ingredientId: string,
  adjustment: number,
  reason?: string,
  userId?: string,
) {
  try {
    const supabase = await createClient();

    // Get current ingredient
    const { data: ingredient, error: fetchError } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", ingredientId)
      .single();

    if (fetchError || !ingredient) {
      throw new Error("Ingredient not found");
    }

    // Update the stock
    const newStock = ingredient.current_stock + adjustment;
    const { data: updatedIngredient, error: updateError } = await supabase
      .from("ingredients")
      .update({
        current_stock: newStock,
      })
      .eq("id", ingredientId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create adjustment record
    const { error: insertError } = await supabase
      .from("stock_adjustments")
      .insert({
        ingredient_id: ingredientId,
        adjustment,
        reason,
        user_id: userId,
      });

    if (insertError) throw insertError;

    return {
      success: true,
      ingredient: updatedIngredient,
      previousStock: ingredient.current_stock,
      newStock: updatedIngredient.current_stock,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check which ingredients are below minimum stock level
 */
export async function checkLowStockIngredients() {
  const supabase = await createClient();
  const { data: ingredients, error } = await supabase
    .from("ingredients")
    .select("*")
    .order("current_stock", { ascending: true });

  if (error) throw error;
  
  return (ingredients || []).filter((ing: any) => ing.current_stock <= ing.minimum_stock);
}

/**
 * Get ingredient usage history for a specific period
 */
export async function getIngredientUsageHistory(
  ingredientId: string,
  startDate: Date,
  endDate: Date,
) {
  const supabase = await createClient();
  const { data: adjustments, error } = await supabase
    .from("stock_adjustments")
    .select("*")
    .eq("ingredient_id", ingredientId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return adjustments;
}

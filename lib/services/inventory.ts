// TesoritoOS - Inventory Deduction Service
// Automatically deducts ingredients from stock when an order is completed

import type { InventoryDeductionResult } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

interface InventoryIngredient {
  id: string;
  name: string;
  current_stock: number;
}

interface InventoryOrder {
  order_items: Array<{
    quantity: number;
    menu_items: {
      ingredient_id: string | null;
      ingredients: InventoryIngredient | null;
      recipe_items: Array<{
        quantity_required: number;
        ingredients: InventoryIngredient | null;
      }> | null;
    } | null;
  }>;
}

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
    const supabase = createAdminClient();

    // Fetch the order with all its items and recipe information
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          menu_items (
            *,
            ingredients (*),
            recipe_items (
              *,
              ingredients (*)
            )
          )
        )
      `,
      )
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
      { ingredient: InventoryIngredient; totalRequired: number }
    >();

    for (const orderItem of (order as unknown as InventoryOrder).order_items) {
      const { menu_items: menuItem, quantity } = orderItem;

      if (!menuItem) continue;

      // 1. Direct tracking of physical items (Option B)
      if (menuItem.ingredients) {
        const ingredient = menuItem.ingredients;
        const totalNeeded = quantity; // 1-to-1 mapping

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
      // 2. Recipe-based tracking of prepared items (Option A)
      else if (menuItem.recipe_items && menuItem.recipe_items.length > 0) {
        for (const recipeItem of menuItem.recipe_items) {
          const { ingredients: ingredient, quantity_required } = recipeItem;
          if (!ingredient) continue;

          const totalNeeded = Number((quantity_required * quantity).toFixed(4));

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
    }

    // Process deductions in parallel
    const updatePromises = [];
    const adjustmentsToInsert = [];

    for (const [
      ingredientId,
      { ingredient, totalRequired },
    ] of ingredientRequirements) {
      const previousStock = ingredient.current_stock;
      const newStock = previousStock - totalRequired;

      updatePromises.push(
        supabase
          .from("ingredients")
          .update({ current_stock: newStock })
          .eq("id", ingredientId)
          .then(({ error }) => {
            if (error) {
              result.success = false;
              result.errors?.push(
                `Failed to update stock for ${ingredient.name}`,
              );
            }
          }),
      );

      adjustmentsToInsert.push({
        ingredient_id: ingredient.id,
        adjustment: -totalRequired,
        reason: `Order deduction`,
        tenant_id: (order as { tenant_id: string }).tenant_id,
        created_at: new Date().toISOString(),
      });

      // Record the deduction
      result.deductions.push({
        ingredientId,
        ingredientName: ingredient.name,
        quantityDeducted: totalRequired,
        previousStock,
        newStock,
      });
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);

      const { error: logError } = await supabase
        .from("stock_adjustments")
        .insert(adjustmentsToInsert);

      if (logError) {
        console.error("Failed to log stock adjustments:", logError);
      }

      // Fire-and-forget: send email alert if any ingredient dropped to/below minimum
      const hasLowStock = result.deductions.some(
        (d) => d.newStock <= 0 || d.newStock <= (
          // We need minimum_stock — fetch it for affected ingredients
          0 // placeholder; actual check is done in the alert API
        ),
      );

      // Trigger alert for any deduction that results in stock at or below 0
      // (conservative: we alert on out-of-stock; the /alert API checks minimum_stock server-side)
      const hasOutOfStock = result.deductions.some((d) => d.newStock <= 0);
      if (hasOutOfStock) {
        // Non-blocking fire-and-forget
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        fetch(`${siteUrl}/api/inventory/alert`, {
          method: "POST",
          headers: {
            // We call this internally, bypassing auth check by adding a server secret header
            "x-internal-secret": process.env.INTERNAL_API_SECRET || "kittnos-internal",
          },
        }).catch((err) =>
          console.error("Failed to send stock alert email:", err),
        );
      }
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
 * Reverses ingredient deductions for an order
 * This function should be called when an order status changes from PAID/DELIVERED back to PENDING/CANCELLED
 *
 * @param orderId - The ID of the order to process
 * @returns Result object with reversal details and any errors
 */
export async function reverseInventoryForOrder(
  orderId: string,
): Promise<InventoryDeductionResult> {
  const result: InventoryDeductionResult = {
    success: true,
    deductions: [],
    errors: [],
  };

  try {
    const supabase = createAdminClient();

    // Fetch the order with all its items and recipe information
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          menu_items (
            *,
            ingredients (*),
            recipe_items (
              *,
              ingredients (*)
            )
          )
        )
      `,
      )
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      result.success = false;
      result.errors = ["Order not found"];
      return result;
    }

    // Calculate total ingredient requirements to reverse
    const ingredientRequirements = new Map<
      string,
      { ingredient: InventoryIngredient; totalRequired: number }
    >();

    for (const orderItem of (order as unknown as InventoryOrder).order_items) {
      const { menu_items: menuItem, quantity } = orderItem;

      if (!menuItem) continue;

      // 1. Direct tracking of physical items (Option B)
      if (menuItem.ingredients) {
        const ingredient = menuItem.ingredients;
        const totalNeeded = quantity;

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
      // 2. Recipe-based tracking (Option A)
      else if (menuItem.recipe_items && menuItem.recipe_items.length > 0) {
        for (const recipeItem of menuItem.recipe_items) {
          const { ingredients: ingredient, quantity_required } = recipeItem;
          if (!ingredient) continue;

          const totalNeeded = Number((quantity_required * quantity).toFixed(4));

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
    }

    // Process reversals in parallel
    const updatePromises = [];
    const adjustmentsToInsert = [];

    for (const [
      ingredientId,
      { ingredient, totalRequired },
    ] of ingredientRequirements) {
      const previousStock = ingredient.current_stock;
      const newStock = previousStock + totalRequired;

      updatePromises.push(
        supabase
          .from("ingredients")
          .update({ current_stock: newStock })
          .eq("id", ingredientId)
          .then(({ error }) => {
            if (error) {
              result.success = false;
              result.errors?.push(
                `Failed to update stock for ${ingredient.name}`,
              );
            }
          }),
      );

      adjustmentsToInsert.push({
        ingredient_id: ingredient.id,
        adjustment: totalRequired,
        reason: `Order reversal (undo)`,
        tenant_id: (order as { tenant_id: string }).tenant_id,
        created_at: new Date().toISOString(),
      });

      // Record the deduction
      result.deductions.push({
        ingredientId,
        ingredientName: ingredient.name,
        quantityDeducted: -totalRequired, // Negative means we added it back
        previousStock,
        newStock,
      });
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);

      const { error: logError } = await supabase
        .from("stock_adjustments")
        .insert(adjustmentsToInsert);

      if (logError) {
        console.error("Failed to log stock adjustments:", logError);
      }
    }

    return result;
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors?.push(`Failed to reverse inventory: ${errorMessage}`);
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
    const supabase = createAdminClient();

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
        tenant_id: ingredient.tenant_id,
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
  const supabase = createAdminClient();
  const { data: ingredients, error } = await supabase
    .from("ingredients")
    .select("*")
    .order("current_stock", { ascending: true });

  if (error) throw error;

  return (ingredients || []).filter(
    (ing: { current_stock: number; minimum_stock: number }) =>
      ing.current_stock <= ing.minimum_stock,
  );
}

/**
 * Get ingredient usage history for a specific period
 */
export async function getIngredientUsageHistory(
  ingredientId: string,
  startDate: Date,
  endDate: Date,
) {
  const supabase = createAdminClient();
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

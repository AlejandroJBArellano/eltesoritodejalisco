// TesoritoOS - Inventory Deduction Service
// Automatically deducts ingredients from stock when an order is created/edited
//
// Dos fuentes de consumo por renglón:
//  1. Producto base: ingrediente directo o receta (flag `inventory_deducted`).
//     Se omite si el renglón tiene `skip_base_inventory` (personalización con
//     "descontar producto base" desactivado).
//  2. Opciones de personalización: snapshot `order_item_options.inventory`
//     (flag `options_inventory_deducted`). Ver docs/PERSONALIZACION_PLATILLOS.md.

import type { InventoryDeductionResult } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateOptionRequirements } from "@/lib/customization/inventory";
import { invalidateMenuCache } from "@/lib/menuCache";

interface InventoryIngredient {
  id: string;
  name: string;
  current_stock: number;
}

interface InventoryOrderItem {
  id: string;
  quantity: number;
  inventory_deducted?: boolean;
  skip_base_inventory?: boolean | null;
  options_inventory_deducted?: boolean | null;
  order_item_options?: Array<{
    quantity: number;
    inventory: Array<{ ingredientId: string; quantity: number }> | null;
  }> | null;
  menu_items: {
    ingredient_id: string | null;
    ingredients: InventoryIngredient | null;
    recipe_items: Array<{
      quantity_required: number;
      ingredients: InventoryIngredient | null;
    }> | null;
  } | null;
}

interface InventoryOrder {
  tenant_id: string;
  order_items: InventoryOrderItem[];
}

const ORDER_SELECT_WITH_OPTIONS = `
  *,
  order_items (
    *,
    order_item_options ( quantity, inventory ),
    menu_items (
      *,
      ingredients (*),
      recipe_items (
        *,
        ingredients (*)
      )
    )
  )
`;

const ORDER_SELECT_LEGACY = `
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
`;

type Direction = "deduct" | "reverse";

async function fetchInventoryOrder(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<InventoryOrder | null> {
  const withOptions = await supabase
    .from("orders")
    .select(ORDER_SELECT_WITH_OPTIONS)
    .eq("id", orderId)
    .single();
  if (!withOptions.error && withOptions.data) {
    return withOptions.data as unknown as InventoryOrder;
  }
  // Migración de personalización pendiente: relación inexistente ⇒ legado.
  const code = (withOptions.error as { code?: string } | null)?.code;
  if (code === "PGRST200" || code === "42P01" || code === "42703") {
    const legacy = await supabase
      .from("orders")
      .select(ORDER_SELECT_LEGACY)
      .eq("id", orderId)
      .single();
    if (!legacy.error && legacy.data) {
      return legacy.data as unknown as InventoryOrder;
    }
  }
  return null;
}

/** Suma el consumo del producto base de los renglones indicados. */
function addBaseRequirements(
  items: InventoryOrderItem[],
  requirements: Map<
    string,
    { ingredient: InventoryIngredient; totalRequired: number }
  >,
) {
  const add = (ingredient: InventoryIngredient, amount: number) => {
    const existing = requirements.get(ingredient.id);
    if (existing) {
      existing.totalRequired = Number(
        (existing.totalRequired + amount).toFixed(4),
      );
    } else {
      requirements.set(ingredient.id, { ingredient, totalRequired: amount });
    }
  };

  for (const orderItem of items) {
    const { menu_items: menuItem, quantity } = orderItem;
    if (!menuItem) continue;

    // 1. Direct tracking of physical items (Option B)
    if (menuItem.ingredients) {
      add(menuItem.ingredients, quantity); // 1-to-1 mapping
    }
    // 2. Recipe-based tracking of prepared items (Option A)
    else if (menuItem.recipe_items && menuItem.recipe_items.length > 0) {
      for (const recipeItem of menuItem.recipe_items) {
        const { ingredients: ingredient, quantity_required } = recipeItem;
        if (!ingredient) continue;
        add(ingredient, Number((quantity_required * quantity).toFixed(4)));
      }
    }
  }
}

interface ProcessScope {
  /** Limitar a estos renglones (por defecto, todos los de la orden). */
  itemIds?: string[];
  /** "options" ignora el producto base. */
  only?: "options";
}

async function processInventory(
  orderId: string,
  direction: Direction,
  scope: ProcessScope = {},
): Promise<InventoryDeductionResult> {
  const result: InventoryDeductionResult = {
    success: true,
    deductions: [],
    errors: [],
  };
  const isDeduct = direction === "deduct";

  try {
    const supabase = createAdminClient();
    const order = await fetchInventoryOrder(supabase, orderId);

    if (!order) {
      result.success = false;
      result.errors = ["Order not found"];
      return result;
    }

    const scopedIds = scope.itemIds ? new Set(scope.itemIds) : null;
    const items = (order.order_items || []).filter(
      (item) => !scopedIds || scopedIds.has(item.id),
    );

    // Renglones cuyo producto base hay que procesar (cambian de flag)
    const baseFlagItems =
      scope.only === "options"
        ? []
        : items.filter((item) =>
            isDeduct
              ? !item.inventory_deducted
              : item.inventory_deducted === true,
          );
    // Solo consumen los que no omiten el base
    const baseConsumingItems = baseFlagItems.filter(
      (item) => !item.skip_base_inventory,
    );

    // Renglones con opciones por procesar
    const optionItems = items.filter((item) => {
      const hasOptionInventory = (item.order_item_options || []).some(
        (o) => Array.isArray(o.inventory) && o.inventory.length > 0,
      );
      if (!hasOptionInventory) return false;
      return isDeduct
        ? !item.options_inventory_deducted
        : item.options_inventory_deducted === true;
    });

    if (baseFlagItems.length === 0 && optionItems.length === 0) {
      return result;
    }

    const ingredientRequirements = new Map<
      string,
      { ingredient: InventoryIngredient; totalRequired: number }
    >();
    addBaseRequirements(baseConsumingItems, ingredientRequirements);

    // Opciones: el snapshot solo trae ids ⇒ consultar nombre/stock actual
    const optionTotals = aggregateOptionRequirements(
      optionItems.map((item) => ({
        itemQuantity: item.quantity,
        options: (item.order_item_options || []).map((o) => ({
          quantity: o.quantity,
          inventory: o.inventory || [],
        })),
      })),
    );
    if (optionTotals.size > 0) {
      const { data: optionIngredients, error: ingError } = await supabase
        .from("ingredients")
        .select("id, name, current_stock")
        .in("id", Array.from(optionTotals.keys()));
      if (ingError) {
        result.success = false;
        result.errors?.push("Failed to load option ingredients");
      }
      for (const ing of (optionIngredients || []) as InventoryIngredient[]) {
        const amount = optionTotals.get(String(ing.id)) || 0;
        const existing = ingredientRequirements.get(String(ing.id));
        if (existing) {
          existing.totalRequired = Number(
            (existing.totalRequired + amount).toFixed(4),
          );
        } else {
          ingredientRequirements.set(String(ing.id), {
            ingredient: ing,
            totalRequired: amount,
          });
        }
      }
    }

    // Process deductions/reversals in parallel
    const updatePromises = [];
    const adjustmentsToInsert = [];

    for (const [
      ingredientId,
      { ingredient, totalRequired },
    ] of ingredientRequirements) {
      const previousStock = ingredient.current_stock;
      const newStock = isDeduct
        ? previousStock - totalRequired
        : previousStock + totalRequired;

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
        adjustment: isDeduct ? -totalRequired : totalRequired,
        reason: isDeduct ? `Order deduction` : `Order cancellation`,
        tenant_id: order.tenant_id,
        created_at: new Date().toISOString(),
      });

      result.deductions.push({
        ingredientId,
        ingredientName: ingredient.name,
        // Negative means we added it back
        quantityDeducted: isDeduct ? totalRequired : -totalRequired,
        previousStock,
        newStock,
      });
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      invalidateMenuCache(order.tenant_id);

      const { error: logError } = await supabase
        .from("stock_adjustments")
        .insert(adjustmentsToInsert);

      if (logError) {
        console.error("Failed to log stock adjustments:", logError);
      }
    }

    // Marcar flags (aunque no haya habido consumo, p. ej. base omitido)
    const baseIds = baseFlagItems.map((item) => item.id).filter(Boolean);
    if (baseIds.length > 0 && (updatePromises.length > 0 || baseFlagItems.length !== baseConsumingItems.length)) {
      const { error: markError } = await supabase
        .from("order_items")
        .update({ inventory_deducted: isDeduct })
        .in("id", baseIds);
      if (markError) {
        console.error(
          `Failed to mark order items as ${isDeduct ? "deducted" : "not deducted"}:`,
          markError,
        );
      }
    }
    const optionIds = optionItems.map((item) => item.id).filter(Boolean);
    if (optionIds.length > 0) {
      const { error: markError } = await supabase
        .from("order_items")
        .update({ options_inventory_deducted: isDeduct })
        .in("id", optionIds);
      if (markError) {
        console.error("Failed to mark option inventory flags:", markError);
      }
    }

    if (isDeduct) {
      // Trigger alert for any deduction that results in stock at or below 0
      // (conservative: we alert on out-of-stock; the /alert API checks minimum_stock server-side)
      const hasOutOfStock = result.deductions.some((d) => d.newStock <= 0);
      if (hasOutOfStock) {
        // Non-blocking fire-and-forget
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        fetch(`${siteUrl}/api/inventory/alert`, {
          method: "POST",
          headers: {
            // We call this internally, bypassing auth check by adding a server secret header
            "x-internal-secret":
              process.env.INTERNAL_API_SECRET || "kittnos-internal",
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
    result.errors?.push(
      `Failed to ${isDeduct ? "deduct" : "reverse"} inventory: ${errorMessage}`,
    );
    return result;
  }
}

/**
 * Deducts ingredients from inventory based on order items, their recipes and
 * the customization options chosen (snapshot). Idempotent per flag.
 *
 * @param orderId - The ID of the order to process
 * @returns Result object with deduction details and any errors
 */
export async function deductInventoryForOrder(
  orderId: string,
): Promise<InventoryDeductionResult> {
  return processInventory(orderId, "deduct");
}

/**
 * Reverses ingredient deductions for an order (base products and options).
 * This function should be called when an order is cancelled.
 *
 * @param orderId - The ID of the order to process
 * @returns Result object with reversal details and any errors
 */
export async function reverseInventoryForOrder(
  orderId: string,
): Promise<InventoryDeductionResult> {
  return processInventory(orderId, "reverse");
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

    invalidateMenuCache(ingredient.tenant_id);

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

/**
 * Repone al inventario lo que consumieron las OPCIONES de ciertos renglones
 * (al editar su personalización). Deja `options_inventory_deducted = false`
 * para que el siguiente `deductInventoryForOrder` descuente la nueva selección.
 */
export async function reverseOptionInventoryForItems(
  orderId: string,
  itemIds: string[],
): Promise<InventoryDeductionResult> {
  if (itemIds.length === 0) {
    return { success: true, deductions: [], errors: [] };
  }
  return processInventory(orderId, "reverse", { itemIds, only: "options" });
}

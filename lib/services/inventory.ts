// TesoritoOS - Inventory Deduction Service
// Automatically deducts ingredients from stock when an order is completed

import type { InventoryDeductionResult } from "@/types";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    // Fetch the order with all its items and recipe information
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menuItem: {
              include: {
                recipeItems: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      result.success = false;
      result.errors = ["Order not found"];
      return result;
    }

    // Calculate total ingredient requirements
    const ingredientRequirements = new Map<
      string,
      { ingredient: any; totalRequired: number }
    >();

    for (const orderItem of order.orderItems) {
      const { menuItem, quantity } = orderItem;

      for (const recipeItem of menuItem.recipeItems) {
        const { ingredient, quantityRequired } = recipeItem;
        const totalNeeded = quantityRequired * quantity;

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

    // Execute the deductions in a transaction
    await prisma.$transaction(async (tx) => {
      for (const [
        ingredientId,
        { ingredient, totalRequired },
      ] of ingredientRequirements) {
        const previousStock = ingredient.currentStock;
        const newStock = previousStock - totalRequired;

        // Check if we have enough stock
        if (newStock < 0) {
          result.errors?.push(
            `Insufficient stock for ${ingredient.name}. Required: ${totalRequired}, Available: ${previousStock}`,
          );
          result.success = false;
          // Continue to show all stock issues
          continue;
        }

        // Update the ingredient stock
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { currentStock: newStock },
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

      // If there were any errors, rollback the transaction
      if (!result.success) {
        throw new Error("Insufficient inventory for order");
      }
    });

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
    return await prisma.$transaction(async (tx) => {
      // Get current ingredient
      const ingredient = await tx.ingredient.findUnique({
        where: { id: ingredientId },
      });

      if (!ingredient) {
        throw new Error("Ingredient not found");
      }

      // Update the stock
      const updatedIngredient = await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          currentStock: ingredient.currentStock + adjustment,
        },
      });

      // Create adjustment record
      await tx.stockAdjustment.create({
        data: {
          ingredientId,
          adjustment,
          reason,
          userId,
        },
      });

      return {
        success: true,
        ingredient: updatedIngredient,
        previousStock: ingredient.currentStock,
        newStock: updatedIngredient.currentStock,
      };
    });
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
  const ingredients = await prisma.ingredient.findMany({
    orderBy: {
      currentStock: "asc",
    },
  });
  return ingredients.filter((ing) => ing.currentStock <= ing.minimumStock);
}

/**
 * Get ingredient usage history for a specific period
 */
export async function getIngredientUsageHistory(
  ingredientId: string,
  startDate: Date,
  endDate: Date,
) {
  const adjustments = await prisma.stockAdjustment.findMany({
    where: {
      ingredientId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return adjustments;
}

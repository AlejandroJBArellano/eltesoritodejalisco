// TesoritoOS - Inventory Adjustment API
// Handles manual stock corrections (purchases, adjustments, mermas)

import { adjustIngredientStock } from "@/lib/services/inventory";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/inventory/adjust
 * Adjust stock level for an ingredient
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredientId, adjustment, reason, userId } = body;

    if (!ingredientId || adjustment === undefined) {
      return NextResponse.json(
        { error: "ingredientId and adjustment are required" },
        { status: 400 },
      );
    }

    const parsedAdjustment = Number(adjustment);
    if (!Number.isFinite(parsedAdjustment)) {
      return NextResponse.json(
        { error: "adjustment must be a valid number" },
        { status: 400 },
      );
    }

    // Validate ingredient belongs to current tenant
    const tenant = await getTenantContext();
    const supabase = await createClient();
    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("id")
      .eq("id", ingredientId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (!ingredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 },
      );
    }

    const result = await adjustIngredientStock(
      ingredientId,
      parsedAdjustment,
      reason,
      userId,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to adjust stock" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      previousStock: result.previousStock,
      newStock: result.newStock,
    });
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    return NextResponse.json(
      { error: "Failed to adjust inventory" },
      { status: 500 },
    );
  }
}

// KittnOS - Inventory Item API
// PATCH /api/inventory/[id] — Update minimum_stock and/or current_stock of a single ingredient

import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/inventory/[id]
 * Get a single ingredient with its stock history
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenant = await getTenantContext();
    const supabase = await createClient();

    const { data: ingredient, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .single();

    if (error || !ingredient) {
      return NextResponse.json(
        { error: "Ingrediente no encontrado" },
        { status: 404 },
      );
    }

    // Fetch last 20 stock adjustments for this ingredient
    const { data: history } = await supabase
      .from("stock_adjustments")
      .select("id, adjustment, reason, created_at, user_id")
      .eq("ingredient_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    const formatted = {
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      currentStock: ingredient.current_stock,
      minimumStock: ingredient.minimum_stock,
      costPerUnit: ingredient.cost_per_unit,
      trackingType: ingredient.tracking_type,
      createdAt: ingredient.created_at,
      updatedAt: ingredient.updated_at,
    };

    return NextResponse.json({ ingredient: formatted, history: history || [] });
  } catch (error) {
    console.error("Error fetching ingredient:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredient" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/inventory/[id]
 * Update minimum_stock (and optionally current_stock) of an ingredient
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const tenant = await getTenantContext();
    const supabase = await createClient();
    const body = await request.json();

    // Validate ingredient belongs to current tenant
    const { data: existing } = await supabase
      .from("ingredients")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "Ingrediente no encontrado" },
        { status: 404 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.minimumStock !== undefined) {
      updates.minimum_stock = Number(body.minimumStock);
    }
    if (body.currentStock !== undefined) {
      updates.current_stock = Number(body.currentStock);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("ingredients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      ingredient: {
        id: updated.id,
        name: updated.name,
        unit: updated.unit,
        currentStock: updated.current_stock,
        minimumStock: updated.minimum_stock,
        costPerUnit: updated.cost_per_unit,
        trackingType: updated.tracking_type,
      },
    });
  } catch (error) {
    console.error("Error updating ingredient:", error);
    return NextResponse.json(
      { error: "Failed to update ingredient" },
      { status: 500 },
    );
  }
}

// TesoritoOS - Inventory API
// Handles ingredients listing and creation

import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";

/**
 * GET /api/inventory
 * List ingredients with optional lowStock filter
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const searchParams = request.nextUrl.searchParams;
    const lowStock = searchParams.get("lowStock") === "true";

    const supabase = await createClient();
    let query = supabase
      .from("ingredients")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("name", { ascending: true });

    const { data: ingredients, error } = await query;
    if (error) throw error;

    let result = ingredients || [];
    if (lowStock) {
      result = result.filter(
        (ing: any) => ing.current_stock <= ing.minimum_stock,
      );
    }

    // Map database snake_case fields to frontend camelCase
    const formatted = result.map((ing: any) => ({
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      currentStock: ing.current_stock,
      minimumStock: ing.minimum_stock,
      costPerUnit: ing.cost_per_unit,
      trackingType: ing.tracking_type,
      createdAt: ing.created_at,
      updatedAt: ing.updated_at,
    }));

    return NextResponse.json({ ingredients: formatted });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/inventory
 * Create a new ingredient/item in the catalog
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const tenant = await getTenantContext();
    const body = await request.json();
    const {
      name,
      unit,
      currentStock,
      minimumStock,
      costPerUnit,
      trackingType,
    } = body;

    if (!name || !unit) {
      return NextResponse.json(
        { error: "Name and unit are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: ingredient, error } = await supabase
      .from("ingredients")
      .insert({
        name,
        unit,
        current_stock: Number(currentStock || 0),
        minimum_stock: Number(minimumStock || 0),
        cost_per_unit: costPerUnit ? Number(costPerUnit) : null,
        tracking_type: trackingType || "MEASURABLE",
        tenant_id: tenant.id,
      })
      .select()
      .single();

    if (error) throw error;

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

    return NextResponse.json({ ingredient: formatted }, { status: 201 });
  } catch (error) {
    console.error("Error creating ingredient:", error);
    return NextResponse.json(
      { error: "Failed to create ingredient" },
      { status: 500 },
    );
  }
}

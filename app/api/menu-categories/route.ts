// TesoritoOS - Menu Categories API
// CRUD + reordering for menu categories with i18n support

import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

/**
 * GET /api/menu-categories
 * Get all categories ordered by sort_order
 */
export async function GET() {
  try {
    const tenant = await getTenantContext();
    const supabase = createAdminClient();
    const { data: categories, error } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching menu categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu categories" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/menu-categories
 * Create a new category
 * Body: { name: string, translations?: Record<string, { name?: string }>, sort_order?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, translations = {}, sort_order } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre de la categoría es obligatorio" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // If no sort_order provided, place at the end
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const { data: maxRow } = await supabase
        .from("menu_categories")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();
      finalSortOrder = (maxRow?.sort_order ?? 0) + 10;
    }

    const { data: category, error } = await supabase
      .from("menu_categories")
      .insert({
        name: name.trim().toUpperCase(),
        translations,
        sort_order: finalSortOrder,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating menu category:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la categoría",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/menu-categories
 * Update a category (name, translations, sort_order, is_active)
 * If name changes, cascade update all menu_items.category
 * Body: { id: string, name?: string, translations?: object, sort_order?: number, is_active?: boolean }
 *   OR for bulk reorder: { reorder: [{ id: string, sort_order: number }] }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Bulk reorder mode
    if (body.reorder && Array.isArray(body.reorder)) {
      const updates = body.reorder as { id: string; sort_order: number }[];

      const errors: string[] = [];
      for (const { id, sort_order } of updates) {
        const { error } = await supabase
          .from("menu_categories")
          .update({ sort_order })
          .eq("id", id);
        if (error) errors.push(error.message);
      }

      if (errors.length > 0) {
        return NextResponse.json(
          { error: `Errores al reordenar: ${errors.join(", ")}` },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    // Single category update
    const { id, name, translations, sort_order, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "El ID de la categoría es obligatorio" },
        { status: 400 },
      );
    }

    // Fetch existing to detect name change for cascade
    const { data: existing, error: fetchError } = await supabase
      .from("menu_categories")
      .select("name")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 },
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (name !== undefined) updatePayload.name = name.trim().toUpperCase();
    if (translations !== undefined) updatePayload.translations = translations;
    if (sort_order !== undefined) updatePayload.sort_order = sort_order;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data: category, error: updateError } = await supabase
      .from("menu_categories")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Cascade rename: update all menu_items that reference the old category name
    const newName = updatePayload.name as string | undefined;
    if (newName && newName !== existing.name) {
      const { error: cascadeError } = await supabase
        .from("menu_items")
        .update({ category: newName })
        .eq("category", existing.name);

      if (cascadeError) {
        console.error("Cascade rename error:", cascadeError);
        // Non-fatal: category was updated, but items may still have old name
      }
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error updating menu category:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la categoría",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/menu-categories
 * Delete a category by ID
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "El ID de la categoría es obligatorio" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Check for associated products
    const { data: existing } = await supabase
      .from("menu_categories")
      .select("name")
      .eq("id", id)
      .single();

    if (existing) {
      const { count } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("category", existing.name);

      if (count && count > 0) {
        return NextResponse.json(
          {
            error: `No se puede eliminar: hay ${count} producto(s) con esta categoría. Reasigna los productos primero.`,
          },
          { status: 409 },
        );
      }
    }

    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu category:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la categoría",
      },
      { status: 500 },
    );
  }
}

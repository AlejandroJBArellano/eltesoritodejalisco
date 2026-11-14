// Personalización de platillos — API del editor (admin)
// GET: configuración completa (incluye recetas de opción) de un producto.
// PUT: reemplaza la configuración de forma atómica (RPC save_menu_item_customization).
// Requiere el permiso menu.manage_customization.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCustomizations } from "@/lib/customization/server";
import {
  computePriceRange,
  emptyCustomization,
  hasBlockingIssues,
  validateCustomizationConfig,
  type MenuItemCustomization,
} from "@/lib/customization";

export const dynamic = "force-dynamic";

const id = z.guid();
const nonNegInt = z.number().int().min(0);

const optionSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  sortOrder: nonNegInt,
  isActive: z.boolean(),
  priceSource: z.enum(["CUSTOM", "LINKED_PRODUCT"]),
  priceDelta: z.number().min(0).max(100000),
  linkedMenuItemId: z.string().min(1).nullable(),
  deductLinkedInventory: z.boolean(),
  outOfStockBehavior: z.enum(["DISABLE", "ALLOW"]),
  recipe: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        quantityRequired: z.number().positive().max(100000),
      }),
    )
    .max(30),
});

const groupSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  sortOrder: nonNegInt,
  minSelect: nonNegInt.max(100),
  maxSelect: z.number().int().min(1).max(100).nullable(),
  allowRepeat: z.boolean(),
  maxPerOption: z.number().int().min(1).max(100).nullable(),
  pricingMode: z.enum(["ADDITIVE", "TIERED"]),
  tierMatchMode: z.enum(["EXACT", "ROUND_UP", "RANGE"]).nullable(),
  isActive: z.boolean(),
  tiers: z
    .array(
      z.object({
        quantityFrom: z.number().int().min(1).max(100),
        quantityTo: z.number().int().min(1).max(100).nullable(),
        price: z.number().min(0).max(100000),
      }),
    )
    .max(30),
  options: z.array(optionSchema).max(60),
});

const customizationSchema = z.object({
  layout: z.enum(["SCROLL", "WIZARD"]),
  deductBase: z.boolean(),
  groups: z.array(groupSchema).max(20),
});

async function authorize() {
  const profile = await getProfile();
  if (!profile) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (!hasPermission(profile, "menu.manage_customization")) {
    return {
      error: NextResponse.json(
        { error: "No tienes permiso para configurar la personalización" },
        { status: 403 },
      ),
    };
  }
  return { profile };
}

async function readConfig(tenantId: string, menuItemId: string) {
  const admin = createAdminClient();
  const { data: item } = await admin
    .from("menu_items")
    .select("id, name, price, customization_layout, customization_deduct_base")
    .eq("id", menuItemId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!item) return null;

  const loaded = await loadCustomizations(tenantId, [menuItemId], admin);
  const customization: MenuItemCustomization = loaded.byMenuItem.get(menuItemId) ?? {
    ...emptyCustomization(),
    layout: (item.customization_layout as "SCROLL" | "WIZARD") || "SCROLL",
    deductBase: item.customization_deduct_base ?? true,
  };
  return {
    menuItem: { id: item.id, name: item.name, price: Number(item.price) || 0 },
    customization,
    priceRange: computePriceRange(Number(item.price) || 0, customization),
  };
}

/**
 * GET /api/menu/:id/customization
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;
    const { id: menuItemId } = await params;
    const tenant = await getTenantContext();
    const result = await readConfig(tenant.id, menuItemId);
    if (!result) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error reading customization:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la personalización" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/menu/:id/customization
 * Body: { customization: MenuItemCustomization }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authorize();
    if (auth.error) return auth.error;
    const { id: menuItemId } = await params;
    const tenant = await getTenantContext();
    const body = await request.json().catch(() => null);

    const parsed = customizationSchema.safeParse(body?.customization);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "La configuración tiene campos inválidos",
          details: parsed.error.issues.slice(0, 10).map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }
    const config = parsed.data as MenuItemCustomization;

    // Ids únicos
    const groupIds = config.groups.map((g) => g.id);
    const optionIds = config.groups.flatMap((g) => g.options.map((o) => o.id));
    if (
      new Set(groupIds).size !== groupIds.length ||
      new Set(optionIds).size !== optionIds.length
    ) {
      return NextResponse.json(
        { error: "Hay grupos u opciones con id repetido" },
        { status: 400 },
      );
    }

    // Reglas de negocio (las mismas que ve el admin en el modal)
    const issues = validateCustomizationConfig(config, menuItemId);
    if (hasBlockingIssues(issues)) {
      return NextResponse.json(
        {
          error: issues.find((i) => i.level === "error")?.message,
          issues,
        },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // El producto existe y es del tenant
    const { data: item } = await admin
      .from("menu_items")
      .select("id")
      .eq("id", menuItemId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!item) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    // Productos enlazados del mismo tenant
    const linkedIds = Array.from(
      new Set(
        config.groups.flatMap((g) =>
          g.options.map((o) => o.linkedMenuItemId).filter((x): x is string => !!x),
        ),
      ),
    );
    if (linkedIds.length > 0) {
      const { data: linked } = await admin
        .from("menu_items")
        .select("id")
        .eq("tenant_id", tenant.id)
        .in("id", linkedIds);
      if ((linked || []).length !== linkedIds.length) {
        return NextResponse.json(
          { error: "Un producto enlazado no existe en este restaurante" },
          { status: 400 },
        );
      }
    }

    // Ingredientes del mismo tenant
    const ingredientIds = Array.from(
      new Set(
        config.groups.flatMap((g) =>
          g.options.flatMap((o) => o.recipe.map((r) => r.ingredientId)),
        ),
      ),
    );
    if (ingredientIds.length > 0) {
      const { data: ingredients } = await admin
        .from("ingredients")
        .select("id")
        .eq("tenant_id", tenant.id)
        .in("id", ingredientIds);
      if ((ingredients || []).length !== ingredientIds.length) {
        return NextResponse.json(
          { error: "Un ingrediente de receta no existe en este restaurante" },
          { status: 400 },
        );
      }
    }

    const { error: rpcError } = await admin.rpc("save_menu_item_customization", {
      p_tenant_id: tenant.id,
      p_menu_item_id: menuItemId,
      p_config: config,
    });
    if (rpcError) throw rpcError;

    const result = await readConfig(tenant.id, menuItemId);
    return NextResponse.json({ ...result, issues });
  } catch (error) {
    console.error("Error saving customization:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la personalización" },
      { status: 500 },
    );
  }
}

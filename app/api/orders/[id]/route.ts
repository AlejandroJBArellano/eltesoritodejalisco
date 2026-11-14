import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCDMXDate } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile, verifyManagerPin } from "@/lib/auth";
import {
  deductInventoryForOrder,
  reverseInventoryForOrder,
  reverseOptionInventoryForItems,
} from "@/lib/services/inventory";
import {
  calculateItemDiscount,
  calculateOrderDiscountTotals,
} from "@/lib/utils/discounts";
import { logOrderAction } from "@/lib/services/orderAudit";
import {
  CustomizationError,
  orderItemCustomizationColumns,
  replaceOrderItemSnapshot,
  resolveOrderItems,
  tenantDiscountIncludesModifiers,
  type OrderItemInput,
} from "@/lib/customization/server";
import {
  formatSelectionLine,
  selectionsEqual,
  type Selection,
} from "@/lib/customization";
import { hasPermission } from "@/lib/permissions";
import {
  mapSelectionLines,
  type DbOrderItemOption,
} from "@/lib/mappers/orders";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

interface PutItem {
  id: string;
  quantity: number;
  discountType?: string | null;
  discountValue?: number | null;
  discountScope?: "ROW" | "UNIT" | null;
  discountReason?: string | null;
  notes?: string | null;
  /** Nueva selección de personalización (si se edita). */
  selections?: Selection[];
}

interface CurrentItemRow {
  id: string;
  unit_price: number;
  quantity: number;
  menu_item_id: string;
  discount_base_price?: number | null;
  options_inventory_deducted?: boolean | null;
  order_item_options?: DbOrderItemOption[] | null;
  menu_items?: { name?: string } | { name?: string }[] | null;
}

/** Renglones actuales; si la migración no está aplicada, sin personalización. */
async function fetchCurrentItems(
  supabase: ServerClient,
  orderId: string,
): Promise<CurrentItemRow[]> {
  const full = await supabase
    .from("order_items")
    .select(
      `
      id,
      unit_price,
      quantity,
      menu_item_id,
      discount_base_price,
      options_inventory_deducted,
      order_item_options ( option_id, group_id, group_name, option_name, quantity, unit_price, group_sort, option_sort ),
      menu_items (
        name
      )
    `,
    )
    .eq("order_id", orderId);
  if (!full.error) return (full.data || []) as unknown as CurrentItemRow[];
  const legacy = await supabase
    .from("order_items")
    .select(
      `
      id,
      unit_price,
      quantity,
      menu_item_id,
      menu_items (
        name
      )
    `,
    )
    .eq("order_id", orderId);
  return (legacy.data || []) as unknown as CurrentItemRow[];
}

async function fetchRemainingItems(supabase: ServerClient, orderId: string) {
  type Row = {
    unit_price: number;
    quantity: number;
    discount_type: string | null;
    discount_value: number | null;
    discount_scope: string | null;
    discount_base_price?: number | null;
  };
  const full = await supabase
    .from("order_items")
    .select(
      "unit_price, quantity, discount_type, discount_value, discount_scope, discount_base_price",
    )
    .eq("order_id", orderId);
  if (!full.error) return (full.data || []) as Row[];
  const legacy = await supabase
    .from("order_items")
    .select("unit_price, quantity, discount_type, discount_value, discount_scope")
    .eq("order_id", orderId);
  return (legacy.data || []) as Row[];
}

function currentSelections(row: CurrentItemRow): Selection[] {
  return (row.order_item_options || [])
    .filter((o): o is DbOrderItemOption & { option_id: string } => !!o.option_id)
    .map((o) => ({ optionId: o.option_id, quantity: Number(o.quantity) || 0 }));
}

/** Ajustes de edición leídos directo de la base (sin caché). */
async function fetchCustomizationSettings(
  tenantId: string,
  fallback: unknown,
): Promise<unknown> {
  const { data, error } = await createAdminClient()
    .from("tenants")
    .select(
      "customization_edit_after_kitchen, customization_edit_reprint, customization_edit_notify_kds",
    )
    .eq("id", tenantId)
    .maybeSingle();
  return error || !data ? fallback : data;
}

type EditPolicy = "NEVER" | "WITH_PERMISSION" | "WITH_MANAGER_AUTH";

function editAfterKitchenPolicy(tenant: unknown): EditPolicy {
  const value = (tenant as { customization_edit_after_kitchen?: string | null })
    ?.customization_edit_after_kitchen;
  return value === "NEVER" || value === "WITH_MANAGER_AUTH"
    ? value
    : "WITH_PERMISSION";
}

function tenantFlag(
  tenant: unknown,
  key: "customization_edit_notify_kds" | "customization_edit_reprint",
): boolean {
  return (tenant as Record<string, unknown> | null)?.[key] !== false;
}

function isManagerProfile(profile: unknown): boolean {
  const p = profile as {
    role?: string | null;
    role_data?: { permissions?: string[] | null } | null;
  } | null;
  const role = (p?.role || "").toUpperCase();
  return (
    role === "ADMIN" ||
    role === "MANAGER" ||
    (p?.role_data?.permissions || []).includes("*")
  );
}

/**
 * GET /api/orders/:id
 * Fetch details of a single order.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenant = await getTenantContext();
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          order_item_options ( option_id, group_id, group_name, option_name, quantity, unit_price, group_sort, option_sort ),
          menu_items (*)
        ),
        payments (*),
        customer:customers (*)
      `,
      )
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Error al obtener la orden" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/orders/:id
 * Replace the full item list of an existing order.
 * Accepts { items: [{ id: string, quantity: number, discountType?, discountValue?, discountScope?, discountReason? }] }.
 * Items missing from the list (or with quantity ≤ 0) are deleted.
 * Order totals and discounts are recalculated automatically.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      items,
      customerId,
      table,
      discountType,
      discountValue,
      discountReason,
      pin,
    } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 },
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // Verify the order exists and belongs to this tenant
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Separate items to keep (quantity > 0) from items to delete (quantity ≤ 0)
    const itemsToKeep = items.filter(
      (i: { id: string; quantity: number }) => i.quantity > 0,
    );
    const keepIds = itemsToKeep.map((i: { id: string }) => i.id);

    // Fetch current order items with menu item names (+ personalización)
    const currentItems = await fetchCurrentItems(supabase, id);

    const currentMap = new Map(currentItems.map((ci) => [ci.id, ci]));
    const currentIds = Array.from(currentMap.keys());

    // Delete items that are no longer in the list
    const idsToDelete = currentIds.filter(
      (cid: string) => !keepIds.includes(cid),
    );

    const hasRemovedItems = idsToDelete.length > 0;
    const hasReducedQuantity = itemsToKeep.some((item) => {
      const existing = currentMap.get(item.id);
      return existing && item.quantity < existing.quantity;
    });

    const profile = await getProfile();
    let manager = null;

    // --- Edición de personalización de renglones ya enviados a cocina ---
    const selectionEdits = (itemsToKeep as PutItem[]).filter((item) => {
      if (!Array.isArray(item.selections)) return false;
      const existing = currentMap.get(item.id);
      if (!existing) return false;
      return !selectionsEqual(currentSelections(existing), item.selections);
    });

    // Los ajustes del tenant viven en un caché por proceso (2 min). Para una
    // regla de permisos se leen frescos de la base cuando hay ediciones.
    const customizationSettings =
      selectionEdits.length > 0
        ? await fetchCustomizationSettings(tenant.id, tenant)
        : tenant;

    if (selectionEdits.length > 0) {
      const policy = editAfterKitchenPolicy(customizationSettings);
      if (policy === "NEVER") {
        return NextResponse.json(
          {
            error:
              "La configuración del restaurante no permite editar la personalización después de enviar a cocina",
          },
          { status: 403 },
        );
      }
      if (policy === "WITH_PERMISSION" && !hasPermission(profile, "pos.edit_order")) {
        return NextResponse.json(
          { error: "No tienes permiso para modificar comandas" },
          { status: 403 },
        );
      }
      if (policy === "WITH_MANAGER_AUTH" && !isManagerProfile(profile)) {
        if (!pin) {
          return NextResponse.json(
            {
              error: "Se requiere PIN de Gerencia para editar la personalización",
              requiresManagerAuth: true,
            },
            { status: 403 },
          );
        }
        manager = await verifyManagerPin(tenant.id, String(pin).trim());
        if (!manager) {
          return NextResponse.json(
            { error: "PIN de autorización incorrecto" },
            { status: 401 },
          );
        }
      }
    }

    const resolvedEdits =
      selectionEdits.length > 0
        ? await resolveOrderItems(
            tenant.id,
            selectionEdits.map(
              (item): OrderItemInput => ({
                menuItemId: currentMap.get(item.id)!.menu_item_id,
                quantity: item.quantity,
                selections: item.selections || [],
              }),
            ),
            {
              includeModifiersInDiscount: tenantDiscountIncludesModifiers(tenant),
            },
          )
        : [];
    const editById = new Map(
      selectionEdits.map((item, index) => [item.id, resolvedEdits[index]]),
    );
    const notifyKds = tenantFlag(customizationSettings, "customization_edit_notify_kds");
    const reprint = tenantFlag(customizationSettings, "customization_edit_reprint");

    if (hasRemovedItems || hasReducedQuantity) {
      if (profile?.role === "WAITER") {
        if (!pin) {
          return NextResponse.json(
            {
              error:
                "Se requiere PIN de Gerencia para eliminar o reducir productos",
            },
            { status: 403 },
          );
        }
        manager = await verifyManagerPin(tenant.id, String(pin).trim());
        if (!manager) {
          return NextResponse.json(
            { error: "PIN de autorización incorrecto" },
            { status: 401 },
          );
        }
      } else if (pin) {
        manager = await verifyManagerPin(tenant.id, String(pin).trim());
      }
    }
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .in("id", idsToDelete);
      if (deleteError) throw deleteError;
    }

    // Personalización editada: reponer inventario de las opciones anteriores
    // y guardar el nuevo snapshot (el descuento nuevo se hace al final).
    if (editById.size > 0) {
      const editedIds = Array.from(editById.keys());
      await reverseOptionInventoryForItems(
        id,
        editedIds.filter((itemId) => currentMap.get(itemId)?.options_inventory_deducted),
      );
      const admin = createAdminClient();
      await Promise.all(
        Array.from(editById.entries()).map(([itemId, resolved]) =>
          replaceOrderItemSnapshot(admin, tenant.id, itemId, resolved),
        ),
      );
    }

    // Update quantities, discounts and notes for items that remain
    const nowIso = new Date().toISOString();
    const updatePromises = (itemsToKeep as PutItem[]).map((item) => {
      const existing = currentMap.get(item.id);
      const edit = editById.get(item.id);
      const unitPrice = edit ? edit.unitPrice : (existing?.unit_price ?? 0);
      const discountBasePrice = edit
        ? edit.discountBasePrice
        : (existing?.discount_base_price ?? null);
      const discountCalc = calculateItemDiscount({
        unitPrice,
        quantity: item.quantity,
        discountType: (item.discountType as "PERCENT" | "FIXED") || null,
        discountValue: item.discountValue,
        discountScope: item.discountScope,
        discountBasePrice,
      });

      return supabase
        .from("order_items")
        .update({
          quantity: item.quantity,
          discount_type: item.discountType ?? null,
          discount_value: item.discountValue ?? null,
          discount_amount: discountCalc.discountAmount,
          discount_scope: item.discountScope ?? "ROW",
          discount_reason: item.discountReason ?? null,
          ...(item.notes !== undefined
            ? { notes: item.notes ? item.notes.trim() || null : null }
            : {}),
          ...(edit
            ? {
                unit_price: edit.unitPrice,
                base_unit_price: edit.hasCustomization ? edit.baseUnitPrice : null,
                discount_base_price: edit.hasCustomization
                  ? edit.discountBasePrice
                  : null,
                options_inventory_deducted: false,
                ...(notifyKds
                  ? { customization_modified_at: nowIso, status: "PENDING" }
                  : {}),
              }
            : {}),
        })
        .eq("id", item.id)
        .eq("order_id", id);
    });

    const updateResults = await Promise.all(updatePromises);
    for (const res of updateResults) {
      if (res.error) throw res.error;
    }

    // Descontar inventario de la nueva selección
    if (resolvedEdits.some((e) => e.options.some((o) => o.inventory.length > 0))) {
      await deductInventoryForOrder(id);
    }

    // Recalculate order totals from what's left in the database
    const remainingItems = await fetchRemainingItems(supabase, id);

    const activeOrderDiscountType =
      discountType !== undefined ? discountType : order.discount_type;
    const activeOrderDiscountValue =
      discountValue !== undefined ? discountValue : order.discount_value;
    const activeOrderDiscountReason =
      discountReason !== undefined ? discountReason : order.discount_reason;

    const totals = calculateOrderDiscountTotals({
      items: remainingItems.map((ri) => ({
        unitPrice: ri.unit_price,
        quantity: ri.quantity,
        discountType: (ri.discount_type as "PERCENT" | "FIXED") || null,
        discountValue: ri.discount_value,
        discountScope: (ri.discount_scope as "ROW" | "UNIT") || null,
        discountBasePrice: ri.discount_base_price ?? null,
      })),
      orderDiscountType:
        (activeOrderDiscountType as "PERCENT" | "FIXED") || null,
      orderDiscountValue: activeOrderDiscountValue,
    });

    const updatePayload: Record<string, unknown> = {
      subtotal: totals.subtotalGross,
      tax: 0,
      ...(editById.size > 0 &&
      notifyKds &&
      ["DELIVERED", "READY"].includes(order.status)
        ? { status: "PENDING" }
        : {}),
      discount_type: activeOrderDiscountType || null,
      discount_value: activeOrderDiscountValue || null,
      discount_amount: totals.orderDiscount,
      discount_reason: activeOrderDiscountReason || null,
      total: totals.total,
      updated_at: getCurrentCDMXDate(),
    };
    if (customerId !== undefined) {
      updatePayload.customer_id = customerId || null;
    }
    if (table !== undefined) {
      updatePayload.table = table || null;
    }

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select(
        `
        *,
        order_items (
          *,
          order_item_options ( option_id, group_id, group_name, option_name, quantity, unit_price, group_sort, option_sort ),
          menu_items (*)
        ),
        customer:customers (*)
      `,
      )
      .single();

    if (updateOrderError) throw updateOrderError;

    const authorizedByName = manager ? manager.full_name || manager.role : null;

    if (hasRemovedItems || hasReducedQuantity) {
      const getItemName = (item: unknown): string => {
        const row = item as
          | { menu_items?: { name?: string } | { name?: string }[] | null }
          | undefined;
        if (!row?.menu_items) return "Producto";
        if (Array.isArray(row.menu_items)) {
          return row.menu_items[0]?.name || "Producto";
        }
        return row.menu_items.name || "Producto";
      };

      const removedSummaries: string[] = [];

      for (const delId of idsToDelete) {
        const existing = currentMap.get(delId);
        if (existing) {
          const name = getItemName(existing);
          removedSummaries.push(`${name} x${existing.quantity}`);
        }
      }

      for (const item of itemsToKeep) {
        const existing = currentMap.get(item.id);
        if (existing && item.quantity < existing.quantity) {
          const name = getItemName(existing);
          const diff = existing.quantity - item.quantity;
          removedSummaries.push(`${name} (-${diff})`);
        }
      }

      const summaryText =
        removedSummaries.length > 0
          ? removedSummaries.join(", ")
          : idsToDelete.length > 0
            ? `${idsToDelete.length} producto(s)`
            : "productos";

      await logOrderAction({
        orderId: id,
        tenantId: tenant.id,
        user: profile,
        actionType: "ITEMS_REMOVED",
        details: {
          summary: summaryText,
          ...(authorizedByName ? { authorizedBy: authorizedByName } : {}),
          removedItemIds: idsToDelete,
        },
        notifyCritical: true,
      });
    }

    const discountChanged =
      (discountType !== undefined ||
        discountValue !== undefined ||
        discountReason !== undefined) &&
      (activeOrderDiscountType !== order.discount_type ||
        activeOrderDiscountValue !== order.discount_value);

    if (discountChanged) {
      await logOrderAction({
        orderId: id,
        tenantId: tenant.id,
        user: profile,
        actionType: "DISCOUNT_APPLIED",
        details: {
          discountType: activeOrderDiscountType,
          discountValue: activeOrderDiscountValue,
          discountReason: activeOrderDiscountReason,
          ...(authorizedByName ? { authorizedBy: authorizedByName } : {}),
        },
        notifyCritical: true,
      });
    }

    if (editById.size > 0) {
      const summary = Array.from(editById.entries())
        .map(([itemId, resolved]) => {
          const existing = currentMap.get(itemId);
          const before = formatSelectionLine(
            mapSelectionLines(existing?.order_item_options),
          );
          const after = formatSelectionLine(resolved.options);
          return `${resolved.menuItemName}: ${before || "sin opciones"} → ${after || "sin opciones"}`;
        })
        .join(" | ");
      await logOrderAction({
        orderId: id,
        tenantId: tenant.id,
        user: profile,
        actionType: "CUSTOMIZATION_EDITED",
        details: {
          summary,
          itemIds: Array.from(editById.keys()),
          ...(authorizedByName ? { authorizedBy: authorizedByName } : {}),
        },
      });
    }

    return NextResponse.json({
      order: updatedOrder,
      reprintItemIds: reprint ? Array.from(editById.keys()) : [],
    });
  } catch (error) {
    if (error instanceof CustomizationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error modifying order:", error);
    return NextResponse.json(
      { error: "Failed to modify order" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      orderItems,
      customerId,
      table,
      discountType,
      discountValue,
      discountReason,
    } = body;

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // Check if order exists and belongs to this tenant
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If no orderItems provided, allow updating metadata or order discount
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      if (
        customerId === undefined &&
        table === undefined &&
        discountType === undefined &&
        discountValue === undefined &&
        discountReason === undefined
      ) {
        return NextResponse.json(
          { error: "No items or updates provided" },
          { status: 400 },
        );
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: getCurrentCDMXDate(),
      };
      if (customerId !== undefined) {
        updatePayload.customer_id = customerId || null;
      }
      if (table !== undefined) {
        updatePayload.table = table || null;
      }

      if (
        discountType !== undefined ||
        discountValue !== undefined ||
        discountReason !== undefined
      ) {
        const activeOrderDiscountType =
          discountType !== undefined ? discountType : order.discount_type;
        const activeOrderDiscountValue =
          discountValue !== undefined ? discountValue : order.discount_value;
        const activeOrderDiscountReason =
          discountReason !== undefined ? discountReason : order.discount_reason;

        const { data: existingItems } = await supabase
          .from("order_items")
          .select(
            "unit_price, quantity, discount_type, discount_value, discount_scope",
          )
          .eq("order_id", id);

        const totals = calculateOrderDiscountTotals({
          items: (existingItems || []).map((ri) => ({
            unitPrice: ri.unit_price,
            quantity: ri.quantity,
            discountType: (ri.discount_type as "PERCENT" | "FIXED") || null,
            discountValue: ri.discount_value,
            discountScope: (ri.discount_scope as "ROW" | "UNIT") || null,
          })),
          orderDiscountType:
            (activeOrderDiscountType as "PERCENT" | "FIXED") || null,
          orderDiscountValue: activeOrderDiscountValue,
        });

        updatePayload.subtotal = totals.subtotalGross;
        updatePayload.discount_type = activeOrderDiscountType || null;
        updatePayload.discount_value = activeOrderDiscountValue || null;
        updatePayload.discount_amount = totals.orderDiscount;
        updatePayload.discount_reason = activeOrderDiscountReason || null;
        updatePayload.total = totals.total;
      }

      const { data: updatedOrder, error: updateOrderError } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select(
          `
          *,
          order_items (
            *,
            order_item_options ( option_id, group_id, group_name, option_name, quantity, unit_price, group_sort, option_sort ),
            menu_items (*)
          ),
          customer:customers (*)
        `,
        )
        .single();

      if (updateOrderError) throw updateOrderError;

      if (
        discountType !== undefined ||
        discountValue !== undefined ||
        discountReason !== undefined
      ) {
        const profile = await getProfile();
        await logOrderAction({
          orderId: id,
          tenantId: tenant.id,
          user: profile,
          actionType: "DISCOUNT_APPLIED",
          details: {
            discountType: updatePayload.discount_type,
            discountValue: updatePayload.discount_value,
            discountReason: updatePayload.discount_reason,
          },
          notifyCritical: true,
        });
      }

      return NextResponse.json({ order: updatedOrder });
    }

    for (const item of orderItems) {
      if (!item.menuItemId) {
        return NextResponse.json(
          { error: "Menu item ID is required for all items" },
          { status: 400 },
        );
      }
    }

    // Validar personalización y precio en el servidor
    const resolvedItems = await resolveOrderItems(
      tenant.id,
      orderItems.map(
        (item: {
          menuItemId: string;
          quantity: number | string;
          notes?: string;
          selections?: { optionId: string; quantity: number }[];
        }): OrderItemInput => ({
          menuItemId: item.menuItemId,
          quantity: Number(item.quantity),
          notes: item.notes || "",
          selections: item.selections || [],
        }),
      ),
      { includeModifiersInDiscount: tenantDiscountIncludesModifiers(tenant) },
    );

    let additionalSubtotal = 0;
    const newItemsData = resolvedItems.map((item) => {
      additionalSubtotal += item.unitPrice * item.quantity;
      return {
        id: crypto.randomUUID(),
        order_id: id,
        tenant_id: tenant.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes || "",
        status: "PENDING",
        ...orderItemCustomizationColumns(item),
      };
    });
    const menuItemNames = new Map(
      resolvedItems.map((item) => [item.menuItemId, item.menuItemName]),
    );

    // Create new order items in database
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(newItemsData);

    if (itemsError) throw itemsError;

    // Snapshot de opciones/niveles de los renglones personalizados
    const admin = createAdminClient();
    await Promise.all(
      resolvedItems.map((item, index) =>
        item.hasCustomization
          ? replaceOrderItemSnapshot(admin, tenant.id, newItemsData[index].id, item)
          : Promise.resolve(),
      ),
    );

    // Deduct inventory immediately for the newly added items
    await deductInventoryForOrder(id);

    const additionalTax = additionalSubtotal * 0;
    const additionalTotal = additionalSubtotal + additionalTax;

    const orderUpdate: {
      subtotal: number;
      tax: number;
      total: number;
      updated_at: string;
      status?: string;
    } = {
      subtotal: (order.subtotal || 0) + additionalSubtotal,
      tax: (order.tax || 0) + additionalTax,
      total: (order.total || 0) + additionalTotal,
      updated_at: getCurrentCDMXDate(),
    };

    if (["DELIVERED", "READY", "COMPLETED"].includes(order.status)) {
      orderUpdate.status = "PENDING";
    }

    // Update order totals
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(orderUpdate)
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select(
        `
        *,
        order_items (
          *,
          order_item_options ( option_id, group_id, group_name, option_name, quantity, unit_price, group_sort, option_sort ),
          menu_items (*)
        ),
        customer:customers (*)
      `,
      )
      .single();

    if (updateError) throw updateError;

    const profile = await getProfile();
    const addedItemsSummary = resolvedItems.map((item) => {
      const name = menuItemNames.get(item.menuItemId) || "Producto";
      const line = formatSelectionLine(item.options);
      return `${name}${line ? ` (${line})` : ""} x${item.quantity}`;
    });

    await logOrderAction({
      orderId: id,
      tenantId: tenant.id,
      user: profile,
      actionType: "ITEMS_ADDED",
      details: {
        summary: addedItemsSummary.join(", "),
        itemsCount: newItemsData.length,
      },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    if (error instanceof CustomizationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/orders/:id
 * Permanently delete a specific order (and its items via cascade).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const tenant = await getTenantContext();
    const body = await request.json().catch(() => ({}));
    const { pin } = body;

    let manager = null;
    if (profile.role === "WAITER") {
      if (!pin) {
        return NextResponse.json(
          { error: "Se requiere PIN de Gerencia para cancelar la orden" },
          { status: 403 },
        );
      }
      manager = await verifyManagerPin(tenant.id, String(pin).trim());
      if (!manager) {
        return NextResponse.json(
          { error: "PIN de autorización incorrecto" },
          { status: 401 },
        );
      }
    } else if (profile.role !== "ADMIN" && profile.role !== "MANAGER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } else if (pin) {
      manager = await verifyManagerPin(tenant.id, String(pin).trim());
    }

    const authorizedByName = manager ? manager.full_name || manager.role : null;

    await logOrderAction({
      orderId: id,
      tenantId: tenant.id,
      user: profile,
      actionType: "CANCELLED",
      details: {
        reason: body.reason || "Orden cancelada",
        ...(authorizedByName ? { authorizedBy: authorizedByName } : {}),
      },
      notifyCritical: true,
    });

    // Revert inventory before deleting order
    await reverseInventoryForOrder(id);

    const supabase = await createClient();
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 },
    );
  }
}

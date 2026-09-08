import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCDMXDate } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile, verifyManagerPin } from "@/lib/auth";
import {
  deductInventoryForOrder,
  reverseInventoryForOrder,
} from "@/lib/services/inventory";
import {
  calculateItemDiscount,
  calculateOrderDiscountTotals,
} from "@/lib/utils/discounts";
import { logOrderAction } from "@/lib/services/orderAudit";

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

    // Fetch current order items
    const { data: currentItems } = await supabase
      .from("order_items")
      .select("id, unit_price, quantity")
      .eq("order_id", id);

    const currentMap = new Map(
      (currentItems || []).map((ci) => [ci.id, ci]),
    );
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

    if (hasRemovedItems || hasReducedQuantity) {
      if (profile?.role === "WAITER") {
        if (!pin) {
          return NextResponse.json(
            { error: "Se requiere PIN de Gerencia para eliminar o reducir productos" },
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

    // Update quantities and discounts for items that remain
    const updatePromises = itemsToKeep.map(
      (item: {
        id: string;
        quantity: number;
        discountType?: string | null;
        discountValue?: number | null;
        discountScope?: "ROW" | "UNIT" | null;
        discountReason?: string | null;
      }) => {
        const existing = currentMap.get(item.id);
        const unitPrice = existing?.unit_price ?? 0;
        const discountCalc = calculateItemDiscount({
          unitPrice,
          quantity: item.quantity,
          discountType: (item.discountType as "PERCENT" | "FIXED") || null,
          discountValue: item.discountValue,
          discountScope: item.discountScope,
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
          })
          .eq("id", item.id)
          .eq("order_id", id);
      },
    );

    const updateResults = await Promise.all(updatePromises);
    for (const res of updateResults) {
      if (res.error) throw res.error;
    }

    // Recalculate order totals from what's left in the database
    const { data: remainingItems } = await supabase
      .from("order_items")
      .select("unit_price, quantity, discount_type, discount_value, discount_scope")
      .eq("order_id", id);

    const activeOrderDiscountType =
      discountType !== undefined ? discountType : order.discount_type;
    const activeOrderDiscountValue =
      discountValue !== undefined ? discountValue : order.discount_value;
    const activeOrderDiscountReason =
      discountReason !== undefined ? discountReason : order.discount_reason;

    const totals = calculateOrderDiscountTotals({
      items: (remainingItems || []).map((ri) => ({
        unitPrice: ri.unit_price,
        quantity: ri.quantity,
        discountType: (ri.discount_type as "PERCENT" | "FIXED") || null,
        discountValue: ri.discount_value,
        discountScope: (ri.discount_scope as "ROW" | "UNIT") || null,
      })),
      orderDiscountType: (activeOrderDiscountType as "PERCENT" | "FIXED") || null,
      orderDiscountValue: activeOrderDiscountValue,
    });

    const updatePayload: Record<string, unknown> = {
      subtotal: totals.subtotalGross,
      tax: 0,
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
          menu_items (*)
        ),
        customer:customers (*)
      `,
      )
      .single();

    if (updateOrderError) throw updateOrderError;

    const authorizedByName = manager
      ? manager.full_name || manager.role
      : profile?.full_name || profile?.role || "Usuario";

    if (hasRemovedItems || hasReducedQuantity) {
      const removedSummaries: string[] = [];
      if (idsToDelete.length > 0) {
        removedSummaries.push(`${idsToDelete.length} producto(s) eliminado(s)`);
      }
      if (hasReducedQuantity) {
        removedSummaries.push("cantidades reducidas");
      }

      await logOrderAction({
        orderId: id,
        tenantId: tenant.id,
        user: profile,
        actionType: "ITEMS_REMOVED",
        details: {
          summary: removedSummaries.join(", "),
          authorizedBy: authorizedByName,
          removedItemIds: idsToDelete,
        },
        notifyCritical: true,
      });
    }

    const discountChanged =
      (discountType !== undefined || discountValue !== undefined || discountReason !== undefined) &&
      (activeOrderDiscountType !== order.discount_type || activeOrderDiscountValue !== order.discount_value);

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
          authorizedBy: authorizedByName,
        },
        notifyCritical: true,
      });
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
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
        return NextResponse.json({ error: "No items or updates provided" }, { status: 400 });
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
          .select("unit_price, quantity, discount_type, discount_value, discount_scope")
          .eq("order_id", id);

        const totals = calculateOrderDiscountTotals({
          items: (existingItems || []).map((ri) => ({
            unitPrice: ri.unit_price,
            quantity: ri.quantity,
            discountType: (ri.discount_type as "PERCENT" | "FIXED") || null,
            discountValue: ri.discount_value,
            discountScope: (ri.discount_scope as "ROW" | "UNIT") || null,
          })),
          orderDiscountType: (activeOrderDiscountType as "PERCENT" | "FIXED") || null,
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
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          ),
          customer:customers (*)
        `)
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

    let additionalSubtotal = 0;
    const newItemsData = [];

    const menuItemIds = orderItems
      .map((item: { menuItemId: string }) => item.menuItemId)
      .filter(Boolean);
    const { data: menuItems, error: menuItemsError } = await supabase
      .from("menu_items")
      .select("*")
      .in("id", menuItemIds)
      .eq("tenant_id", tenant.id);

    if (menuItemsError) {
      throw new Error("Failed to fetch menu items");
    }

    const menuItemMap = new Map(
      menuItems?.map((item) => [item.id, item]) || [],
    );

    // Process each new item
    for (const item of orderItems) {
      if (!item.menuItemId) {
        return NextResponse.json(
          { error: "Menu item ID is required for all items" },
          { status: 400 },
        );
      }

      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found` },
          { status: 400 },
        );
      }

      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for item ${menuItem.name}` },
          { status: 400 },
        );
      }

      const itemTotal = menuItem.price * quantity;
      additionalSubtotal += itemTotal;

      newItemsData.push({
        id: crypto.randomUUID(),
        order_id: id,
        tenant_id: tenant.id,
        menu_item_id: item.menuItemId,
        quantity: quantity,
        unit_price: menuItem.price,
        notes: item.notes || "",
        status: "PENDING",
      });
    }

    // Create new order items in database
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(newItemsData);

    if (itemsError) throw itemsError;

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
          menu_items (*)
        ),
        customer:customers (*)
      `,
      )
      .single();

    if (updateError) throw updateError;

    const profile = await getProfile();
    const addedItemsSummary = newItemsData.map((item) => {
      const menuItem = menuItemMap.get(item.menu_item_id);
      return `${menuItem?.name || "Producto"} x${item.quantity}`;
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

    const authorizedByName = manager
      ? manager.full_name || manager.role
      : profile.full_name || profile.role;

    await logOrderAction({
      orderId: id,
      tenantId: tenant.id,
      user: profile,
      actionType: "CANCELLED",
      details: {
        reason: body.reason || "Orden cancelada",
        authorizedBy: authorizedByName,
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

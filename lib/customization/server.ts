/**
 * Personalización de platillos — capa de servidor (Supabase).
 *
 * - Carga configuraciones con precio de productos enlazados y bandera de agotado.
 * - Resuelve renglones de orden: valida la selección y calcula el precio en el
 *   servidor (el precio del cliente nunca se usa).
 * - Construye el snapshot que se guarda en order_item_options / _group_tiers.
 *
 * Si la migración aún no está aplicada (tablas inexistentes), todo degrada a
 * "sin personalización" para no tumbar el POS.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSelectionSnapshot,
  getActiveGroups,
  getDiscountBasePrice,
  hasCustomization,
  isOptionOutOfStock,
  normalizeSelections,
  optionInventoryPerUnit,
  priceSelection,
  validateSelection,
  type CustomizationGroup,
  type CustomizationLayout,
  type CustomizationOption,
  type IngredientRequirement,
  type LinkedItemInventory,
  type MenuItemCustomization,
  type OutOfStockBehavior,
  type PricedGroupTier,
  type PriceSource,
  type PricingMode,
  type Selection,
  type SelectionSnapshotLine,
  type TierMatchMode,
} from "./index";

type AdminClient = ReturnType<typeof createAdminClient>;

// ---------------------------------------------------------------------------
// Mapeo DB → dominio
// ---------------------------------------------------------------------------

export interface DbOptionRecipeRow {
  ingredient_id: string;
  quantity_required: number;
}

export interface DbOptionRow {
  id: string;
  group_id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
  price_source: string | null;
  price_delta: number | null;
  linked_menu_item_id: string | null;
  deduct_linked_inventory: boolean | null;
  out_of_stock_behavior: string | null;
  menu_item_option_recipe_items?: DbOptionRecipeRow[] | null;
}

export interface DbTierRow {
  quantity_from: number;
  quantity_to: number | null;
  price: number;
}

export interface DbGroupRow {
  id: string;
  menu_item_id: string;
  name: string;
  sort_order: number | null;
  min_select: number | null;
  max_select: number | null;
  allow_repeat: boolean | null;
  max_per_option: number | null;
  pricing_mode: string | null;
  tier_match_mode: string | null;
  is_active: boolean | null;
  menu_item_option_group_tiers?: DbTierRow[] | null;
  menu_item_options?: DbOptionRow[] | null;
}

export function mapDbOption(row: DbOptionRow): CustomizationOption {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    priceSource: (row.price_source as PriceSource) || "CUSTOM",
    priceDelta: Number(row.price_delta) || 0,
    linkedMenuItemId: row.linked_menu_item_id ?? null,
    deductLinkedInventory: row.deduct_linked_inventory ?? true,
    outOfStockBehavior:
      (row.out_of_stock_behavior as OutOfStockBehavior) || "DISABLE",
    recipe: (row.menu_item_option_recipe_items || []).map((r) => ({
      ingredientId: String(r.ingredient_id),
      quantityRequired: Number(r.quantity_required) || 0,
    })),
  };
}

export function mapDbGroup(row: DbGroupRow): CustomizationGroup {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? 0,
    minSelect: row.min_select ?? 0,
    maxSelect: row.max_select ?? null,
    allowRepeat: row.allow_repeat ?? false,
    maxPerOption: row.max_per_option ?? null,
    pricingMode: (row.pricing_mode as PricingMode) || "ADDITIVE",
    tierMatchMode: (row.tier_match_mode as TierMatchMode) || null,
    isActive: row.is_active ?? true,
    tiers: (row.menu_item_option_group_tiers || [])
      .map((t) => ({
        quantityFrom: Number(t.quantity_from),
        quantityTo: t.quantity_to == null ? null : Number(t.quantity_to),
        price: Number(t.price) || 0,
      }))
      .sort((a, b) => a.quantityFrom - b.quantityFrom),
    options: (row.menu_item_options || [])
      .map(mapDbOption)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

const GROUP_SELECT = `
  id, menu_item_id, name, sort_order, min_select, max_select, allow_repeat,
  max_per_option, pricing_mode, tier_match_mode, is_active,
  menu_item_option_group_tiers ( quantity_from, quantity_to, price ),
  menu_item_options (
    id, group_id, name, sort_order, is_active, price_source, price_delta,
    linked_menu_item_id, deduct_linked_inventory, out_of_stock_behavior,
    menu_item_option_recipe_items ( ingredient_id, quantity_required )
  )
`;

/** Errores de "tabla/columna no existe" ⇒ migración pendiente. */
function isMissingSchemaError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "42703" || code === "PGRST200" || code === "PGRST204";
}

// ---------------------------------------------------------------------------
// Carga de configuraciones
// ---------------------------------------------------------------------------

export interface LoadedCustomizations {
  byMenuItem: Map<string, MenuItemCustomization>;
  /** Consumo por unidad de cada opción (para el snapshot de inventario). */
  inventoryByOption: Map<string, IngredientRequirement[]>;
}

interface LinkedMenuItemRow {
  id: string;
  name: string;
  price: number;
  is_available: boolean | null;
  ingredient_id: string | null;
  recipe_items?: { ingredient_id: string; quantity_required: number }[] | null;
}

/**
 * Carga la personalización de los productos indicados (o de todo el tenant).
 * Siempre usa el cliente de servicio filtrando por tenant: Pickup es anónimo.
 */
export async function loadCustomizations(
  tenantId: string,
  menuItemIds?: string[],
  client?: AdminClient,
): Promise<LoadedCustomizations> {
  try {
    return await loadCustomizationsUnsafe(
      tenantId,
      menuItemIds,
      client ?? createAdminClient(),
    );
  } catch (error) {
    console.error("[customization] Failed to load customizations:", error);
    return { byMenuItem: new Map(), inventoryByOption: new Map() };
  }
}

async function loadCustomizationsUnsafe(
  tenantId: string,
  menuItemIds: string[] | undefined,
  client: AdminClient,
): Promise<LoadedCustomizations> {
  const empty: LoadedCustomizations = {
    byMenuItem: new Map(),
    inventoryByOption: new Map(),
  };
  if (menuItemIds && menuItemIds.length === 0) return empty;

  let groupQuery = client
    .from("menu_item_option_groups")
    .select(GROUP_SELECT)
    .eq("tenant_id", tenantId);
  if (menuItemIds) groupQuery = groupQuery.in("menu_item_id", menuItemIds);

  const { data: groupRows, error: groupError } = await groupQuery;
  if (groupError) {
    if (!isMissingSchemaError(groupError)) {
      console.error("[customization] Error loading groups:", groupError);
    }
    return empty;
  }
  const rows = (groupRows || []) as unknown as DbGroupRow[];
  if (rows.length === 0) return empty;

  const itemIds = Array.from(new Set(rows.map((r) => r.menu_item_id)));
  const { data: itemSettings } = await client
    .from("menu_items")
    .select("id, customization_layout, customization_deduct_base")
    .eq("tenant_id", tenantId)
    .in("id", itemIds);
  const settingsById = new Map(
    ((itemSettings || []) as {
      id: string;
      customization_layout: string | null;
      customization_deduct_base: boolean | null;
    }[]).map((s) => [s.id, s]),
  );

  const groups = rows.map((r) => ({ menuItemId: r.menu_item_id, group: mapDbGroup(r) }));

  // Productos enlazados (precio, nombre, disponibilidad, receta)
  const linkedIds = Array.from(
    new Set(
      groups.flatMap(({ group }) =>
        group.options.map((o) => o.linkedMenuItemId).filter((x): x is string => !!x),
      ),
    ),
  );
  const linkedById = new Map<string, LinkedMenuItemRow>();
  if (linkedIds.length > 0) {
    const { data: linkedRows } = await client
      .from("menu_items")
      .select(
        "id, name, price, is_available, ingredient_id, recipe_items ( ingredient_id, quantity_required )",
      )
      .eq("tenant_id", tenantId)
      .in("id", linkedIds);
    for (const row of (linkedRows || []) as unknown as LinkedMenuItemRow[]) {
      linkedById.set(row.id, row);
    }
  }

  const linkedInventory = (id: string | null): LinkedItemInventory | null => {
    if (!id) return null;
    const row = linkedById.get(id);
    if (!row) return { isAvailable: false, ingredientId: null, recipe: [] };
    return {
      isAvailable: row.is_available !== false,
      ingredientId: row.ingredient_id ? String(row.ingredient_id) : null,
      recipe: (row.recipe_items || []).map((r) => ({
        ingredientId: String(r.ingredient_id),
        quantityRequired: Number(r.quantity_required) || 0,
      })),
    };
  };

  // Stock de ingredientes involucrados
  const ingredientIds = new Set<string>();
  for (const { group } of groups) {
    for (const option of group.options) {
      option.recipe.forEach((r) => ingredientIds.add(r.ingredientId));
      const linked = linkedInventory(option.linkedMenuItemId);
      if (linked?.ingredientId) ingredientIds.add(linked.ingredientId);
      linked?.recipe.forEach((r) => ingredientIds.add(r.ingredientId));
    }
  }
  const stockByIngredient = new Map<string, number>();
  if (ingredientIds.size > 0) {
    const { data: stockRows } = await client
      .from("ingredients")
      .select("id, current_stock")
      .eq("tenant_id", tenantId)
      .in("id", Array.from(ingredientIds));
    for (const s of (stockRows || []) as { id: string; current_stock: number }[]) {
      stockByIngredient.set(String(s.id), Number(s.current_stock) || 0);
    }
  }

  const result: LoadedCustomizations = {
    byMenuItem: new Map(),
    inventoryByOption: new Map(),
  };

  for (const { menuItemId, group } of groups) {
    for (const option of group.options) {
      const linked = linkedInventory(option.linkedMenuItemId);
      const linkedRow = option.linkedMenuItemId
        ? linkedById.get(option.linkedMenuItemId)
        : undefined;
      option.linkedMenuItemPrice = linkedRow ? Number(linkedRow.price) || 0 : null;
      option.linkedMenuItemName = linkedRow ? linkedRow.name : null;
      option.isOutOfStock = isOptionOutOfStock(option, stockByIngredient, linked);
      result.inventoryByOption.set(option.id, optionInventoryPerUnit(option, linked));
    }

    let entry = result.byMenuItem.get(menuItemId);
    if (!entry) {
      const settings = settingsById.get(menuItemId);
      entry = {
        layout: (settings?.customization_layout as CustomizationLayout) || "SCROLL",
        deductBase: settings?.customization_deduct_base ?? true,
        groups: [],
      };
      result.byMenuItem.set(menuItemId, entry);
    }
    entry.groups.push(group);
  }

  for (const entry of result.byMenuItem.values()) {
    entry.groups.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Resolución de renglones de orden
// ---------------------------------------------------------------------------

export class CustomizationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "CustomizationError";
  }
}

export interface OrderItemInput {
  menuItemId: string;
  quantity: number | string;
  notes?: string | null;
  selections?: Selection[] | null;
  discountType?: "PERCENT" | "FIXED" | null;
  discountValue?: number | null;
  discountScope?: "ROW" | "UNIT" | null;
  discountReason?: string | null;
}

export interface ResolvedOptionLine extends SelectionSnapshotLine {
  inventory: IngredientRequirement[];
}

export interface ResolvedOrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  notes: string | null;
  selections: Selection[];
  hasCustomization: boolean;
  unitPrice: number;
  baseUnitPrice: number;
  discountBasePrice: number;
  skipBaseInventory: boolean;
  options: ResolvedOptionLine[];
  tiers: PricedGroupTier[];
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: number | null;
  discountScope: "ROW" | "UNIT";
  discountReason: string | null;
}

interface MenuItemPriceRow {
  id: string;
  name: string;
  price: number;
  is_available: boolean | null;
}

/** Lee el ajuste de tenant con default seguro si la columna aún no existe. */
export function tenantDiscountIncludesModifiers(tenant: unknown): boolean {
  const value = (tenant as { discount_includes_modifiers?: boolean | null } | null)
    ?.discount_includes_modifiers;
  return value !== false;
}

/**
 * Valida y pone precio a los renglones. Lanza CustomizationError (400) con un
 * mensaje claro si algo no cuadra (producto ajeno, selección inválida, etc.).
 */
export async function resolveOrderItems(
  tenantId: string,
  items: OrderItemInput[],
  options: {
    includeModifiersInDiscount: boolean;
    client?: AdminClient;
    preloaded?: LoadedCustomizations;
  },
): Promise<ResolvedOrderItem[]> {
  const client = options.client ?? createAdminClient();
  const ids = Array.from(new Set(items.map((i) => i.menuItemId).filter(Boolean)));
  if (ids.length === 0) return [];

  const { data: menuRows, error } = await client
    .from("menu_items")
    .select("id, name, price, is_available")
    .eq("tenant_id", tenantId)
    .in("id", ids);
  if (error) throw error;
  const menuById = new Map(
    ((menuRows || []) as MenuItemPriceRow[]).map((m) => [m.id, m]),
  );

  const loaded = options.preloaded ?? (await loadCustomizations(tenantId, ids, client));

  return items.map((input) => {
    const menuItem = menuById.get(input.menuItemId);
    if (!menuItem) {
      throw new CustomizationError(`Producto ${input.menuItemId} no encontrado`);
    }
    const quantity = Number(input.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new CustomizationError(`Cantidad inválida para ${menuItem.name}`);
    }

    const customization = loaded.byMenuItem.get(menuItem.id) ?? null;
    const customizable = hasCustomization(customization);
    const selections = normalizeSelections(input.selections);

    if (!customizable && selections.length > 0) {
      throw new CustomizationError(`${menuItem.name} no admite personalización`);
    }

    let unitPrice = Number(menuItem.price) || 0;
    let baseUnitPrice = unitPrice;
    let lines: ResolvedOptionLine[] = [];
    let tiers: PricedGroupTier[] = [];

    if (customizable && customization) {
      const validation = validateSelection(customization, selections);
      if (!validation.valid) {
        throw new CustomizationError(
          `${menuItem.name}: ${validation.errors[0]?.message || "personalización inválida"}`,
        );
      }
      const price = priceSelection(menuItem.price, customization, selections);
      unitPrice = price.unitPrice;
      baseUnitPrice = price.basePrice;
      tiers = price.tiers;
      lines = buildSelectionSnapshot(customization, selections).map((line) => ({
        ...line,
        inventory: line.optionId ? loaded.inventoryByOption.get(line.optionId) || [] : [],
      }));
    }

    const discountBasePrice = customizable
      ? getDiscountBasePrice(
          { basePrice: baseUnitPrice, unitPrice },
          options.includeModifiersInDiscount,
        )
      : unitPrice;

    return {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity,
      notes: input.notes ? String(input.notes) : null,
      selections,
      hasCustomization: customizable,
      unitPrice,
      baseUnitPrice,
      discountBasePrice,
      skipBaseInventory: customizable && customization ? !customization.deductBase : false,
      options: lines,
      tiers,
      discountType: input.discountType || null,
      discountValue:
        input.discountValue != null && input.discountValue !== ("" as unknown)
          ? Number(input.discountValue)
          : null,
      discountScope: input.discountScope || "ROW",
      discountReason: input.discountReason || null,
    };
  });
}

/** Elemento de p_items para create_order_with_items (snake_case). */
export function toRpcItem(item: ResolvedOrderItem) {
  return {
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    notes: item.notes,
    unit_price: item.unitPrice,
    base_unit_price: item.hasCustomization ? item.baseUnitPrice : null,
    discount_base_price: item.hasCustomization ? item.discountBasePrice : null,
    skip_base_inventory: item.skipBaseInventory,
    discount_type: item.discountType,
    discount_value: item.discountValue,
    discount_scope: item.discountScope,
    discount_reason: item.discountReason,
    options: item.options.map(toSnapshotRow),
    tiers: item.tiers.map((t) => ({
      group_id: t.groupId,
      group_name: t.groupName,
      quantity: t.quantity,
      price: t.price,
    })),
  };
}

function toSnapshotRow(line: ResolvedOptionLine) {
  return {
    option_id: line.optionId,
    group_id: line.groupId,
    group_name: line.groupName,
    option_name: line.optionName,
    quantity: line.quantity,
    unit_price: line.unitPrice,
    group_sort: line.groupSort,
    option_sort: line.optionSort,
    inventory: line.inventory,
  };
}

/** Columnas extra de order_items para inserts directos (no RPC). */
export function orderItemCustomizationColumns(item: ResolvedOrderItem) {
  return {
    unit_price: item.unitPrice,
    base_unit_price: item.hasCustomization ? item.baseUnitPrice : null,
    discount_base_price: item.hasCustomization ? item.discountBasePrice : null,
    skip_base_inventory: item.skipBaseInventory,
    options_inventory_deducted: false,
  };
}

/**
 * Guarda el snapshot de opciones y niveles de un renglón ya insertado.
 * Reemplaza lo existente (sirve también para editar).
 */
export async function replaceOrderItemSnapshot(
  client: AdminClient,
  tenantId: string,
  orderItemId: string,
  item: Pick<ResolvedOrderItem, "options" | "tiers">,
): Promise<void> {
  const [delOptions, delTiers] = await Promise.all([
    client.from("order_item_options").delete().eq("order_item_id", orderItemId),
    client.from("order_item_group_tiers").delete().eq("order_item_id", orderItemId),
  ]);
  if (delOptions.error && !isMissingSchemaError(delOptions.error)) throw delOptions.error;
  if (delTiers.error && !isMissingSchemaError(delTiers.error)) throw delTiers.error;

  if (item.options.length > 0) {
    const { error } = await client.from("order_item_options").insert(
      item.options.map((line) => ({
        tenant_id: tenantId,
        order_item_id: orderItemId,
        ...toSnapshotRow(line),
      })),
    );
    if (error) throw error;
  }
  if (item.tiers.length > 0) {
    const { error } = await client.from("order_item_group_tiers").insert(
      item.tiers.map((t) => ({
        tenant_id: tenantId,
        order_item_id: orderItemId,
        group_id: t.groupId,
        group_name: t.groupName,
        quantity: t.quantity,
        price: t.price,
      })),
    );
    if (error) throw error;
  }
}

/** Para respuestas JSON: { error } con status adecuado. */
export function customizationErrorStatus(error: unknown): number | null {
  return error instanceof CustomizationError ? error.status : null;
}

/** Grupos activos para enviar al cliente (POS / Pickup). */
export function serializeForClient(
  customization: MenuItemCustomization | undefined,
): MenuItemCustomization | null {
  if (!customization || !hasCustomization(customization)) return null;
  return {
    layout: customization.layout,
    deductBase: customization.deductBase,
    groups: getActiveGroups(customization).map((g) => ({
      ...g,
      options: g.options.map((o) => ({
        ...o,
        // La receta interna no se expone al cliente.
        recipe: [],
      })),
    })),
  };
}

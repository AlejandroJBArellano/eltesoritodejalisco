/**
 * Fake mínimo de Supabase en memoria para tests de rutas.
 *
 * Soporta: from(table).select(cols).eq().in().order().single().maybeSingle(),
 * insert(rows), update(payload).eq()/in(), delete().eq()/in() y await directo.
 * Las relaciones anidadas de personalización se resuelven por convención:
 *   menu_item_option_groups → menu_item_option_group_tiers (group_id),
 *                             menu_item_options (group_id)
 *   menu_item_options → menu_item_option_recipe_items (option_id)
 *   menu_items → recipe_items (menu_item_id)
 */
type Row = Record<string, unknown>;

const CHILDREN: Record<string, { table: string; fk: string }[]> = {
  menu_item_option_groups: [
    { table: "menu_item_option_group_tiers", fk: "group_id" },
    { table: "menu_item_options", fk: "group_id" },
  ],
  menu_item_options: [{ table: "menu_item_option_recipe_items", fk: "option_id" }],
  menu_items: [{ table: "recipe_items", fk: "menu_item_id" }],
  order_items: [
    { table: "order_item_options", fk: "order_item_id" },
    { table: "order_item_group_tiers", fk: "order_item_id" },
  ],
  orders: [{ table: "order_items", fk: "order_id" }],
};

export interface FakeDb {
  tables: Record<string, Row[]>;
  inserts: Record<string, Row[]>;
  updates: { table: string; payload: Row; filters: [string, unknown][] }[];
  deletes: { table: string; filters: [string, unknown][] }[];
  client: { from: (table: string) => unknown; rpc?: unknown };
}

function attachChildren(db: FakeDb, table: string, row: Row): Row {
  const children = CHILDREN[table];
  if (!children) return row;
  const out: Row = { ...row };
  for (const child of children) {
    out[child.table] = (db.tables[child.table] || [])
      .filter((r) => r[child.fk] === row.id)
      .map((r) => attachChildren(db, child.table, r));
  }
  return out;
}

let idCounter = 0;

export function createFakeDb(tables: Record<string, Row[]> = {}): FakeDb {
  const db: FakeDb = {
    tables: JSON.parse(JSON.stringify(tables)),
    inserts: {},
    updates: [],
    deletes: [],
    client: { from: () => null },
  };

  db.client.from = (table: string) => {
    const filters: [string, unknown, "eq" | "in"][] = [];
    let mode: "select" | "update" | "delete" = "select";
    let payload: Row = {};
    let returning = false;

    const matches = (row: Row) =>
      filters.every(([col, val, op]) =>
        op === "in"
          ? (val as unknown[]).map(String).includes(String(row[col]))
          : String(row[col]) === String(val),
      );

    const run = () => {
      const rows = db.tables[table] || [];
      if (mode === "update") {
        db.updates.push({
          table,
          payload,
          filters: filters.map(([c, v]) => [c, v]),
        });
        const updated = rows.filter(matches);
        updated.forEach((r) => Object.assign(r, payload));
        return {
          data: returning ? updated.map((r) => attachChildren(db, table, r)) : null,
          error: null,
        };
      }
      if (mode === "delete") {
        db.deletes.push({ table, filters: filters.map(([c, v]) => [c, v]) });
        db.tables[table] = rows.filter((r) => !matches(r));
        return { data: null, error: null };
      }
      return {
        data: rows.filter(matches).map((r) => attachChildren(db, table, r)),
        error: null,
      };
    };

    const builder: Record<string, unknown> = {
      select: () => {
        if (mode === "update") returning = true;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push([col, val, "eq"]);
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push([col, vals, "in"]);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      single: async () => {
        const res = run();
        const first = Array.isArray(res.data) ? res.data[0] : null;
        return first
          ? { data: first, error: null }
          : { data: null, error: { message: "not found" } };
      },
      maybeSingle: async () => {
        const res = run();
        return { data: Array.isArray(res.data) ? (res.data[0] ?? null) : null, error: null };
      },
      update: (p: Row) => {
        mode = "update";
        payload = p;
        return builder;
      },
      delete: () => {
        mode = "delete";
        return builder;
      },
      insert: (rows: Row | Row[]) => {
        const list = (Array.isArray(rows) ? rows : [rows]).map((r) =>
          "id" in r ? r : { id: `fake-${table}-${++idCounter}`, ...r },
        );
        db.tables[table] = [...(db.tables[table] || []), ...list];
        db.inserts[table] = [...(db.inserts[table] || []), ...list];
        const result = { data: list, error: null };
        const inserted: Record<string, unknown> = {
          select: () => inserted,
          single: async () => ({ data: list[0], error: null }),
          maybeSingle: async () => ({ data: list[0] ?? null, error: null }),
          then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
        };
        return inserted;
      },
      // Filtros que no afectan los datos del fake
      or: () => builder,
      gt: () => builder,
      gte: () => builder,
      lte: () => builder,
      neq: () => builder,
      range: () => builder,
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  };

  return db;
}

/** Semilla del caso Tesorito: Tacos Mixtos (EXACT 3 → $120, Pastor +$10). */
export function tesoritoTables(tenantId = "tenant-123") {
  return {
    menu_items: [
      {
        id: "mi-mixtos",
        tenant_id: tenantId,
        name: "Tacos Mixtos",
        price: 0,
        is_available: true,
        ingredient_id: null,
        customization_layout: "SCROLL",
        customization_deduct_base: true,
      },
      {
        id: "mi-coca",
        tenant_id: tenantId,
        name: "Coca Cola",
        price: 30,
        is_available: true,
        ingredient_id: null,
      },
    ],
    menu_item_option_groups: [
      {
        id: "g-tacos",
        tenant_id: tenantId,
        menu_item_id: "mi-mixtos",
        name: "Elige tus tacos",
        sort_order: 0,
        min_select: 3,
        max_select: 3,
        allow_repeat: true,
        max_per_option: null,
        pricing_mode: "TIERED",
        tier_match_mode: "EXACT",
        is_active: true,
      },
    ],
    menu_item_option_group_tiers: [
      { group_id: "g-tacos", quantity_from: 3, quantity_to: null, price: 120 },
    ],
    menu_item_options: [
      { id: "o-carnitas", group_id: "g-tacos", name: "Carnitas", sort_order: 0, is_active: true, price_source: "CUSTOM", price_delta: 0, linked_menu_item_id: null, deduct_linked_inventory: true, out_of_stock_behavior: "DISABLE" },
      { id: "o-birria", group_id: "g-tacos", name: "Birria", sort_order: 1, is_active: true, price_source: "CUSTOM", price_delta: 0, linked_menu_item_id: null, deduct_linked_inventory: true, out_of_stock_behavior: "DISABLE" },
      { id: "o-jamaica", group_id: "g-tacos", name: "Jamaica", sort_order: 2, is_active: true, price_source: "CUSTOM", price_delta: 0, linked_menu_item_id: null, deduct_linked_inventory: true, out_of_stock_behavior: "DISABLE" },
      { id: "o-pastor", group_id: "g-tacos", name: "Pastor", sort_order: 3, is_active: true, price_source: "CUSTOM", price_delta: 10, linked_menu_item_id: null, deduct_linked_inventory: true, out_of_stock_behavior: "DISABLE" },
    ],
    menu_item_option_recipe_items: [
      { option_id: "o-birria", ingredient_id: "ing-birria", quantity_required: 0.1 },
    ],
    ingredients: [
      { id: "ing-birria", tenant_id: tenantId, name: "Birria", current_stock: 5 },
    ],
  };
}

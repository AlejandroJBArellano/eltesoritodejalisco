import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  order: null as unknown,
  ingredientRows: [] as { id: string; name: string; current_stock: number }[],
  stockUpdates: [] as { id: string; current_stock: number }[],
  flagUpdates: [] as { payload: Record<string, unknown>; ids: string[] }[],
  adjustments: [] as unknown[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: state.order, error: null }),
            }),
          }),
        };
      }
      if (table === "ingredients") {
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => ({
              data: state.ingredientRows.filter((r) => ids.includes(r.id)),
              error: null,
            }),
          }),
          update: (payload: { current_stock: number }) => ({
            eq: (_col: string, id: string) => ({
              then: (cb: (r: { error: null }) => void) => {
                state.stockUpdates.push({ id, current_stock: payload.current_stock });
                cb({ error: null });
                return Promise.resolve();
              },
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          update: (payload: Record<string, unknown>) => ({
            in: async (_col: string, ids: string[]) => {
              state.flagUpdates.push({ payload, ids });
              return { error: null };
            },
          }),
        };
      }
      if (table === "stock_adjustments") {
        return {
          insert: async (rows: unknown[]) => {
            state.adjustments.push(...rows);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import {
  deductInventoryForOrder,
  reverseInventoryForOrder,
} from "../inventory";

const tortilla = { id: "tortilla", name: "Tortilla", current_stock: 100 };

function mixtosOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    tenant_id: "t1",
    order_items: [
      {
        id: "oi-mixtos",
        quantity: 2,
        inventory_deducted: false,
        skip_base_inventory: false,
        options_inventory_deducted: false,
        order_item_options: [
          { quantity: 2, inventory: [{ ingredientId: "birria", quantity: 0.1 }] },
          { quantity: 1, inventory: [{ ingredientId: "pastor", quantity: 0.08 }] },
          { quantity: 1, inventory: [] },
        ],
        menu_items: {
          ingredient_id: null,
          ingredients: null,
          recipe_items: [{ quantity_required: 3, ingredients: tortilla }],
        },
        ...overrides,
      },
    ],
  };
}

describe("inventory with customization options", () => {
  beforeEach(() => {
    state.stockUpdates = [];
    state.flagUpdates = [];
    state.adjustments = [];
    state.ingredientRows = [
      { id: "birria", name: "Birria", current_stock: 5 },
      { id: "pastor", name: "Pastor", current_stock: 4 },
    ];
  });

  it("deducts base recipe and option snapshot, marking both flags", async () => {
    state.order = mixtosOrder();
    const result = await deductInventoryForOrder("o1");

    expect(result.success).toBe(true);
    const byId = Object.fromEntries(
      result.deductions.map((d) => [d.ingredientId, d.quantityDeducted]),
    );
    expect(byId).toEqual({ tortilla: 6, birria: 0.4, pastor: 0.16 });
    expect(state.stockUpdates).toContainEqual({ id: "birria", current_stock: 4.6 });
    expect(state.flagUpdates).toContainEqual({
      payload: { inventory_deducted: true },
      ids: ["oi-mixtos"],
    });
    expect(state.flagUpdates).toContainEqual({
      payload: { options_inventory_deducted: true },
      ids: ["oi-mixtos"],
    });
  });

  it("skips the base product when skip_base_inventory is set but still marks it", async () => {
    state.order = mixtosOrder({ skip_base_inventory: true });
    const result = await deductInventoryForOrder("o1");

    expect(result.deductions.map((d) => d.ingredientId).sort()).toEqual([
      "birria",
      "pastor",
    ]);
    expect(state.flagUpdates).toContainEqual({
      payload: { inventory_deducted: true },
      ids: ["oi-mixtos"],
    });
  });

  it("is idempotent: base already deducted by SQL, only options pending", async () => {
    state.order = mixtosOrder({ inventory_deducted: true });
    const result = await deductInventoryForOrder("o1");
    expect(result.deductions.map((d) => d.ingredientId).sort()).toEqual([
      "birria",
      "pastor",
    ]);
    expect(
      state.flagUpdates.find((f) => "inventory_deducted" in f.payload),
    ).toBeUndefined();
  });

  it("does nothing when everything is already deducted", async () => {
    state.order = mixtosOrder({
      inventory_deducted: true,
      options_inventory_deducted: true,
    });
    const result = await deductInventoryForOrder("o1");
    expect(result.deductions).toHaveLength(0);
    expect(state.adjustments).toHaveLength(0);
  });

  it("reverses options and base (not the skipped base)", async () => {
    state.order = mixtosOrder({
      inventory_deducted: true,
      options_inventory_deducted: true,
      skip_base_inventory: true,
    });
    const result = await reverseInventoryForOrder("o1");
    const byId = Object.fromEntries(
      result.deductions.map((d) => [d.ingredientId, d.quantityDeducted]),
    );
    expect(byId).toEqual({ birria: -0.4, pastor: -0.16 });
    expect(state.stockUpdates).toContainEqual({ id: "pastor", current_stock: 4.16 });
    expect(state.flagUpdates).toContainEqual({
      payload: { options_inventory_deducted: false },
      ids: ["oi-mixtos"],
    });
  });

  it("merges option and base consumption of the same ingredient", async () => {
    state.ingredientRows.push({ ...tortilla });
    state.order = mixtosOrder({
      order_item_options: [
        { quantity: 1, inventory: [{ ingredientId: "tortilla", quantity: 1 }] },
      ],
    });
    const result = await deductInventoryForOrder("o1");
    expect(result.deductions).toEqual([
      expect.objectContaining({ ingredientId: "tortilla", quantityDeducted: 8 }),
    ]);
  });
});

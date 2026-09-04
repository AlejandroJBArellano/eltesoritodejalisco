import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deductInventoryForOrder,
  reverseInventoryForOrder,
} from "../inventory";

// Mock the supabase server client
const { mockFrom, mockUpdate, mockInsert } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockIn = vi.fn().mockResolvedValue({ error: null });
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({
    eq: mockUpdateEq,
    in: mockIn,
  });
  const mockInsert = vi.fn().mockResolvedValue({ error: null });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "ingredients") {
      return { update: mockUpdate };
    }
    if (table === "order_items") {
      return { update: mockUpdate };
    }
    if (table === "stock_adjustments") {
      return { insert: mockInsert };
    }
    return { select: mockSelect };
  });

  return { mockFrom, mockUpdate, mockInsert };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockFrom,
  }),
}));

import { createClient } from "@/lib/supabase/server";

describe("lib/services/inventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate deductions correctly and mark items as deducted", async () => {
    const mockOrder = {
      id: "order-123",
      tenant_id: "tenant-abc",
      order_items: [
        {
          id: "oi-1",
          quantity: 2,
          inventory_deducted: false,
          menu_items: {
            id: "menu-direct",
            ingredient_id: "ing-direct",
            ingredients: {
              id: "ing-direct",
              name: "Coca Cola",
              current_stock: 10,
            },
            recipe_items: null,
          },
        },
        {
          id: "oi-2",
          quantity: 3,
          inventory_deducted: false,
          menu_items: {
            id: "menu-recipe",
            ingredient_id: null,
            ingredients: null,
            recipe_items: [
              {
                quantity_required: 0.1,
                ingredients: {
                  id: "ing-recipe-1",
                  name: "Carne Pastor",
                  current_stock: 5,
                },
              },
            ],
          },
        },
      ],
    };

    const client = await createClient();
    const mockFromFn = client.from as unknown as () => {
      select: () => {
        eq: () => {
          single: { mockResolvedValue: (v: unknown) => void };
        };
      };
    };
    const mockSingle = mockFromFn().select().eq().single;
    mockSingle.mockResolvedValue({ data: mockOrder, error: null });

    const result = await deductInventoryForOrder("order-123");

    expect(result.success).toBe(true);
    expect(result.deductions).toHaveLength(2);

    // Direct deduction: 2 Coca Colas (1-to-1)
    const directDeduction = result.deductions.find(
      (d) => d.ingredientId === "ing-direct",
    );
    expect(directDeduction).toBeDefined();
    expect(directDeduction?.quantityDeducted).toBe(2);

    // Recipe deduction: 3 * 0.1 = 0.3 Carne Pastor
    const recipeDeduction = result.deductions.find(
      (d) => d.ingredientId === "ing-recipe-1",
    );
    expect(recipeDeduction).toBeDefined();
    expect(recipeDeduction?.quantityDeducted).toBe(0.3);

    // Verify order_items were marked as inventory_deducted = true
    expect(mockUpdate).toHaveBeenCalledWith({ inventory_deducted: true });
  });

  it("should ignore items that were already deducted (idempotency)", async () => {
    const mockOrder = {
      id: "order-123",
      tenant_id: "tenant-abc",
      order_items: [
        {
          id: "oi-1",
          quantity: 2,
          inventory_deducted: true,
          menu_items: {
            id: "menu-direct",
            ingredient_id: "ing-direct",
            ingredients: {
              id: "ing-direct",
              name: "Coca Cola",
              current_stock: 8,
            },
            recipe_items: null,
          },
        },
      ],
    };

    const client = await createClient();
    const mockFromFn = client.from as unknown as () => {
      select: () => {
        eq: () => {
          single: { mockResolvedValue: (v: unknown) => void };
        };
      };
    };
    const mockSingle = mockFromFn().select().eq().single;
    mockSingle.mockResolvedValue({ data: mockOrder, error: null });

    const result = await deductInventoryForOrder("order-123");

    expect(result.success).toBe(true);
    expect(result.deductions).toHaveLength(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should only deduct newly added items when extra items are added to an order", async () => {
    const mockOrder = {
      id: "order-123",
      tenant_id: "tenant-abc",
      order_items: [
        {
          id: "oi-1",
          quantity: 2,
          inventory_deducted: true, // Already deducted
          menu_items: {
            id: "menu-direct",
            ingredient_id: "ing-direct",
            ingredients: {
              id: "ing-direct",
              name: "Coca Cola",
              current_stock: 8,
            },
            recipe_items: null,
          },
        },
        {
          id: "oi-new",
          quantity: 1,
          inventory_deducted: false, // New extra item
          menu_items: {
            id: "menu-direct-2",
            ingredient_id: "ing-water",
            ingredients: {
              id: "ing-water",
              name: "Agua Natural",
              current_stock: 15,
            },
            recipe_items: null,
          },
        },
      ],
    };

    const client = await createClient();
    const mockFromFn = client.from as unknown as () => {
      select: () => {
        eq: () => {
          single: { mockResolvedValue: (v: unknown) => void };
        };
      };
    };
    const mockSingle = mockFromFn().select().eq().single;
    mockSingle.mockResolvedValue({ data: mockOrder, error: null });

    const result = await deductInventoryForOrder("order-123");

    expect(result.success).toBe(true);
    expect(result.deductions).toHaveLength(1);
    expect(result.deductions[0].ingredientId).toBe("ing-water");
    expect(result.deductions[0].quantityDeducted).toBe(1);
  });

  it("should calculate reversals correctly for deducted items and mark them as un-deducted", async () => {
    const mockOrder = {
      id: "order-123",
      tenant_id: "tenant-abc",
      order_items: [
        {
          id: "oi-1",
          quantity: 2,
          inventory_deducted: true,
          menu_items: {
            id: "menu-direct",
            ingredient_id: "ing-direct",
            ingredients: {
              id: "ing-direct",
              name: "Coca Cola",
              current_stock: 8,
            },
            recipe_items: null,
          },
        },
      ],
    };

    const client = await createClient();
    const mockFromFn = client.from as unknown as () => {
      select: () => {
        eq: () => {
          single: { mockResolvedValue: (v: unknown) => void };
        };
      };
    };
    const mockSingle = mockFromFn().select().eq().single;
    mockSingle.mockResolvedValue({ data: mockOrder, error: null });

    const result = await reverseInventoryForOrder("order-123");

    expect(result.success).toBe(true);
    expect(result.deductions).toHaveLength(1);

    const directReversal = result.deductions.find(
      (d) => d.ingredientId === "ing-direct",
    );
    expect(directReversal).toBeDefined();
    expect(directReversal?.quantityDeducted).toBe(-2); // -2 means we added 2 back

    // Verify order_items were updated to inventory_deducted: false
    expect(mockUpdate).toHaveBeenCalledWith({ inventory_deducted: false });
  });

  it("should not reverse items that were not deducted", async () => {
    const mockOrder = {
      id: "order-123",
      tenant_id: "tenant-abc",
      order_items: [
        {
          id: "oi-1",
          quantity: 2,
          inventory_deducted: false,
          menu_items: {
            id: "menu-direct",
            ingredient_id: "ing-direct",
            ingredients: {
              id: "ing-direct",
              name: "Coca Cola",
              current_stock: 10,
            },
            recipe_items: null,
          },
        },
      ],
    };

    const client = await createClient();
    const mockFromFn = client.from as unknown as () => {
      select: () => {
        eq: () => {
          single: { mockResolvedValue: (v: unknown) => void };
        };
      };
    };
    const mockSingle = mockFromFn().select().eq().single;
    mockSingle.mockResolvedValue({ data: mockOrder, error: null });

    const result = await reverseInventoryForOrder("order-123");

    expect(result.success).toBe(true);
    expect(result.deductions).toHaveLength(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

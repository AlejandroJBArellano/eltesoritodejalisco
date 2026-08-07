import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deductInventoryForOrder,
  reverseInventoryForOrder,
} from "../inventory";

// Mock the supabase server client
const { mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockUpdate = vi
    .fn()
    .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const mockInsert = vi.fn().mockResolvedValue({ error: null });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "ingredients") {
      return { update: mockUpdate };
    }
    if (table === "stock_adjustments") {
      return { insert: mockInsert };
    }
    return { select: mockSelect };
  });

  return { mockFrom };
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

  it("should calculate deductions correctly for direct and recipe items", async () => {
    const mockOrder = {
      id: "order-123",
      tenant_id: "tenant-abc",
      order_items: [
        {
          quantity: 2,
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
          quantity: 3,
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
    const mockSingle = (client.from as any)().select().eq().single;
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
  });

  it("should calculate reversals correctly", async () => {
    const mockOrder = {
      id: "order-123",
      tenant_id: "tenant-abc",
      order_items: [
        {
          quantity: 2,
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
    const mockSingle = (client.from as any)().select().eq().single;
    mockSingle.mockResolvedValue({ data: mockOrder, error: null });

    const result = await reverseInventoryForOrder("order-123");

    expect(result.success).toBe(true);
    expect(result.deductions).toHaveLength(1);

    const directReversal = result.deductions.find(
      (d) => d.ingredientId === "ing-direct",
    );
    expect(directReversal).toBeDefined();
    expect(directReversal?.quantityDeducted).toBe(-2); // -2 means we added 2 back
  });
});

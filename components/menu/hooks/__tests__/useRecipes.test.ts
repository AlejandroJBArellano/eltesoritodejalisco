import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecipes } from "../useRecipes";
import { MenuItem, RecipeItem } from "../../types";

const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Taco Pastor",
    price: 25,
    isAvailable: true,
    category: "Tacos",
  },
];

const mockRecipeItems: RecipeItem[] = [
  {
    id: "rec-1",
    menuItemId: "1",
    ingredientId: "ing-1",
    ingredientName: "Carne al Pastor",
    quantityRequired: 0.1,
  },
];

describe("useRecipes Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should initialize default states correctly", () => {
    const { result } = renderHook(() => useRecipes(mockMenuItems));

    expect(result.current.recipeItems).toEqual([]);
    expect(result.current.isRecipeModalOpen).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("should open modal and fetch recipes for a menu item", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recipeItems: mockRecipeItems }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useRecipes(mockMenuItems));

    await act(async () => {
      result.current.openRecipeModal("1");
    });

    expect(result.current.isRecipeModalOpen).toBe(true);
    expect(result.current.selectedRecipeMenuItemId).toBe("1");
    expect(mockFetch).toHaveBeenCalledWith("/api/recipes?menuItemId=1");
    expect(result.current.recipeItems).toEqual(mockRecipeItems);
  });

  it("should delete recipe item on delete confirm", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useRecipes(mockMenuItems));

    // Select menu item first to populate selectedRecipeMenuItemId
    act(() => {
      result.current.setSelectedRecipeMenuItemId("1");
    });

    // First call arms deletion
    await act(async () => {
      await result.current.deleteRecipe("rec-1");
    });
    expect(result.current.deleteArmedRecipeId).toBe("rec-1");

    // Second call confirms deletion
    await act(async () => {
      await result.current.deleteRecipe("rec-1");
    });
    expect(result.current.deleteArmedRecipeId).toBe(null);
    // 2 calls: 1 delete API, 1 fetch list API to refresh
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

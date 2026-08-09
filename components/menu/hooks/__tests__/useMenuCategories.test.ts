import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMenuCategories } from "../useMenuCategories";
import { MenuCategory } from "../../types";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

const mockCategories: MenuCategory[] = [
  {
    id: "cat-1",
    name: "Tacos",
    sort_order: 10,
    show_in_pickup: true,
    is_active: true,
  },
  {
    id: "cat-2",
    name: "Bebidas",
    sort_order: 20,
    show_in_pickup: true,
    is_active: true,
  },
];

describe("useMenuCategories Hook", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should initialize default states correctly", () => {
    const { result } = renderHook(() => useMenuCategories(mockCategories));

    expect(result.current.menuCategories).toEqual(mockCategories);
    expect(result.current.isCategoryModalOpen).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("should open modal for category", () => {
    const { result } = renderHook(() => useMenuCategories(mockCategories));

    act(() => {
      result.current.openCategoryModal(mockCategories[0]);
    });

    expect(result.current.isCategoryModalOpen).toBe(true);
    expect(result.current.categoryForm.name).toBe("Tacos");
  });

  it("should delete category on delete confirm", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useMenuCategories(mockCategories));

    // First call arms deletion
    await act(async () => {
      await result.current.handleDeleteCategory("cat-1");
    });
    expect(result.current.deleteArmedCategoryId).toBe("cat-1");
    expect(mockFetch).not.toHaveBeenCalled();

    // Second call confirms deletion
    await act(async () => {
      await result.current.handleDeleteCategory("cat-1");
    });
    expect(result.current.deleteArmedCategoryId).toBe(null);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("should reorder categories optimistically and submit to API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useMenuCategories(mockCategories));

    await act(async () => {
      await result.current.handleMoveCategoryOrder(1, "up");
    });

    // The order should swap
    expect(result.current.menuCategories[0].id).toBe("cat-2");
    expect(result.current.menuCategories[1].id).toBe("cat-1");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

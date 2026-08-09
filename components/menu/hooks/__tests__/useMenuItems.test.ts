import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMenuItems } from "../useMenuItems";
import { MenuItem } from "../../types";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Taco Pastor",
    price: 25,
    isAvailable: true,
    category: "Tacos",
  },
  {
    id: "2",
    name: "Agua de Horchata",
    price: 30,
    isAvailable: false,
    category: "Bebidas",
  },
];

describe("useMenuItems Hook", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should initialize default states correctly", () => {
    const { result } = renderHook(() => useMenuItems(mockMenuItems));

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBe(null);
    expect(result.current.isProductModalOpen).toBe(false);
    expect(result.current.formState.name).toBe("");
    expect(result.current.isEditing).toBe(false);
  });

  it("should open product modal for a new product and reset form", () => {
    const { result } = renderHook(() => useMenuItems(mockMenuItems));

    act(() => {
      result.current.openNewProductModal();
    });

    expect(result.current.isProductModalOpen).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.formState.name).toBe("");
  });

  it("should open edit product modal with item details filled", () => {
    const { result } = renderHook(() => useMenuItems(mockMenuItems));

    act(() => {
      result.current.openEditProductModal(mockMenuItems[0]);
    });

    expect(result.current.isProductModalOpen).toBe(true);
    expect(result.current.isEditing).toBe(true);
    expect(result.current.formState.name).toBe("Taco Pastor");
    expect(result.current.formState.price).toBe("25");
  });

  it("should handle form value changes correctly", () => {
    const { result } = renderHook(() => useMenuItems(mockMenuItems));

    act(() => {
      result.current.handleFormChange("name", "Taco Asada");
    });

    expect(result.current.formState.name).toBe("Taco Asada");
  });

  it("should delete product and call router.refresh() on deletion confirm", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useMenuItems(mockMenuItems));

    // First call arms deletion
    await act(async () => {
      await result.current.handleDelete("1");
    });
    expect(result.current.deleteArmedItemId).toBe("1");
    expect(mockFetch).not.toHaveBeenCalled();

    // Second call confirms deletion
    await act(async () => {
      await result.current.handleDelete("1");
    });
    expect(result.current.deleteArmedItemId).toBe(null);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

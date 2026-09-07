import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePOSData } from "../usePOSData";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: function () {
        return this;
      },
      subscribe: function (cb?: (status: string) => void) {
        if (cb) cb("SUBSCRIBED");
        return this;
      },
    }),
    removeChannel: vi.fn(),
  }),
}));

const mockMenuItems = [
  {
    id: "item-1",
    name: "Taco al Pastor",
    price: 25,
    category: "TACOS",
    is_available: true,
  },
  {
    id: "item-2",
    name: "Agua de Horchata",
    price: 30,
    category: "bebidas", // lowercase to test case-insensitivity
    is_available: true,
  },
  {
    id: "item-3",
    name: "Especial Secreto",
    price: 50,
    category: "DESCONOCIDA", // not in categories registry
    is_available: true,
  },
  {
    id: "item-4",
    name: "Producto Huérfano",
    price: 15,
    category: null,
    is_available: true,
  },
  {
    id: "item-5",
    name: "Taco Agotado",
    price: 25,
    category: "TACOS",
    is_available: false, // not available
  },
];

const mockCategories = [
  { id: "cat-1", name: "TACOS", sort_order: 10, is_active: true },
  { id: "cat-2", name: "BEBIDAS", sort_order: 20, is_active: true },
  { id: "cat-3", name: "INACTIVA", sort_order: 30, is_active: false },
];

describe("usePOSData Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/menu-categories")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ categories: mockCategories }),
        } as Response);
      }
      if (urlStr.includes("/api/menu")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: mockMenuItems }),
        } as Response);
      }
      if (urlStr.includes("/api/customers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ customers: [] }),
        } as Response);
      }
      if (urlStr.includes("/api/orders")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ orders: [] }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    });
  });

  it("should load active categories dynamically and append OTROS", async () => {
    const { result } = renderHook(() => usePOSData("tenant-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Inactive category should be filtered out, OTROS appended
    expect(result.current.categories).toEqual(["TACOS", "BEBIDAS", "OTROS"]);
    expect(result.current.availableMenuItems).toHaveLength(4); // Excludes item-5
  });

  it("should filter items by category case-insensitively", async () => {
    const { result } = renderHook(() => usePOSData("tenant-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Filter by TACOS
    act(() => {
      result.current.setActiveCategory("TACOS");
    });

    expect(result.current.filteredMenuItems.map((m) => m.name)).toEqual([
      "Taco al Pastor",
    ]);

    // Filter by BEBIDAS (matches "bebidas" in item-2)
    act(() => {
      result.current.setActiveCategory("BEBIDAS");
    });

    expect(result.current.filteredMenuItems.map((m) => m.name)).toEqual([
      "Agua de Horchata",
    ]);
  });

  it("should filter unassigned and unregistered categories under OTROS", async () => {
    const { result } = renderHook(() => usePOSData("tenant-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setActiveCategory("OTROS");
    });

    const itemNames = result.current.filteredMenuItems.map((m) => m.name);
    expect(itemNames).toContain("Especial Secreto"); // Category DESCONOCIDA not in registered categories
    expect(itemNames).toContain("Producto Huérfano"); // Null category
    expect(itemNames).not.toContain("Taco al Pastor");
    expect(itemNames).not.toContain("Agua de Horchata");
  });

  it("should filter by search query", async () => {
    const { result } = renderHook(() => usePOSData("tenant-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery("Pastor");
    });

    expect(result.current.filteredMenuItems).toHaveLength(1);
    expect(result.current.filteredMenuItems[0].name).toBe("Taco al Pastor");
  });
});

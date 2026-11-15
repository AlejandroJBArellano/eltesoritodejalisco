import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePOSData } from "../usePOSData";

const capturedChannels: Array<{
  name: string;
  filters: Array<{ table: string; filter?: string }>;
  callback?: (payload: unknown) => void;
}> = [];

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (name: string) => {
      const entry: (typeof capturedChannels)[number] = {
        name,
        filters: [],
      };
      capturedChannels.push(entry);
      return {
        on: function (
          _event: string,
          opts: { table: string; filter?: string },
          cb: (payload: unknown) => void,
        ) {
          entry.filters.push({ table: opts.table, filter: opts.filter });
          entry.callback = cb;
          return this;
        },
        subscribe: function (cb?: (status: string) => void) {
          if (cb) cb("SUBSCRIBED");
          return this;
        },
      };
    },
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
    capturedChannels.length = 0;

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
      if (urlStr.includes("/api/pos/orders") || urlStr.includes("/api/orders")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            orders: [],
            counts: { total: 0, pending: 0, paid: 0, pos: 0, pickup: 0 },
            pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
            stats: { count: 0, sales: 0, avgTicket: 0 },
          }),
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

  it("should provide menuItemMap for O(1) lookups", async () => {
    const { result } = renderHook(() => usePOSData("tenant-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.menuItemMap).toBeInstanceOf(Map);
    expect(result.current.menuItemMap.get("item-1")?.name).toBe(
      "Taco al Pastor",
    );
    expect(result.current.menuItemMap.get("item-2")?.price).toBe(30);
    expect(result.current.menuItemMap.has("non-existent")).toBe(false);
  });

  it("fetches /api/pos/orders once on mount and does not reload catalog when paginating", async () => {
    const { result } = renderHook(() => usePOSData("tenant-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const fetchMock = vi.mocked(global.fetch);
    const initialCalls = fetchMock.mock.calls.map(([u]) => u.toString());
    expect(
      initialCalls.filter((u) => u.includes("/api/pos/orders")),
    ).toHaveLength(1);
    expect(initialCalls.filter((u) => u.includes("/api/menu?"))).toHaveLength(
      0,
    );
    const initialMenuCalls = initialCalls.filter(
      (u) => u === "/api/menu",
    ).length;
    expect(initialMenuCalls).toBe(1);

    await act(async () => {
      result.current.setOrdersPage(2);
    });

    await waitFor(() => {
      const updatedCalls = fetchMock.mock.calls.map(([u]) => u.toString());
      expect(
        updatedCalls.filter((u) => u.includes("/api/pos/orders")),
      ).toHaveLength(2);
      expect(updatedCalls.filter((u) => u === "/api/menu")).toHaveLength(1);
    });
  });

  it("filters ingredients Realtime subscription by tenant_id and suppresses echo after refreshOrders", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePOSData("tenant-123"));

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const ingredientsChannel = capturedChannels.find((c) =>
      c.filters.some((f) => f.table === "ingredients"),
    );
    expect(ingredientsChannel?.filters).toContainEqual({
      table: "ingredients",
      filter: "tenant_id=eq.tenant-123",
    });

    const fetchMock = vi.mocked(global.fetch);
    const beforeRefreshOrdersCount = fetchMock.mock.calls.filter(([u]) =>
      u.toString().includes("/api/pos/orders"),
    ).length;

    await act(async () => {
      await result.current.refreshOrders();
    });

    const afterRefreshOrdersCount = fetchMock.mock.calls.filter(([u]) =>
      u.toString().includes("/api/pos/orders"),
    ).length;
    expect(afterRefreshOrdersCount).toBe(beforeRefreshOrdersCount + 1);

    // Trigger immediate Realtime echo on orders channel -> should be suppressed within 1.5s
    const ordersChannel = capturedChannels.find((c) =>
      c.filters.some((f) => f.table === "orders"),
    );
    act(() => {
      ordersChannel?.callback?.({ eventType: "UPDATE" });
      vi.advanceTimersByTime(500);
    });

    const afterEchoCount = fetchMock.mock.calls.filter(([u]) =>
      u.toString().includes("/api/pos/orders"),
    ).length;
    expect(afterEchoCount).toBe(afterRefreshOrdersCount);

    vi.useRealTimers();
  });
});

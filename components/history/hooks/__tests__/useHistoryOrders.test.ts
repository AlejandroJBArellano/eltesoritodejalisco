import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistoryOrders } from "../useHistoryOrders";
import { OrderStatus, PaymentMethod, type OrderWithDetails } from "@/types";

const mockOrders: OrderWithDetails[] = [
  {
    id: "ord-1",
    orderNumber: "1001",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Mesa 1",
    notes: "",
    subtotal: 100,
    tax: 16,
    total: 116,
    createdAt: new Date("2026-09-01T12:00:00Z"),
    updatedAt: new Date("2026-09-01T12:30:00Z"),
    orderItems: [],
    payments: [
      {
        id: "p-1",
        orderId: "ord-1",
        method: PaymentMethod.CASH,
        amount: 116,
        createdAt: new Date(),
      },
    ],
  },
  {
    id: "ord-2",
    orderNumber: "1002",
    source: "PICKUP_APP",
    status: OrderStatus.DELIVERED,
    table: undefined,
    notes: "Pickup note",
    subtotal: 200,
    tax: 32,
    total: 232,
    createdAt: new Date("2026-09-02T14:00:00Z"),
    updatedAt: new Date("2026-09-02T14:30:00Z"),
    orderItems: [],
    payments: [
      {
        id: "p-2",
        orderId: "ord-2",
        method: PaymentMethod.CARD,
        amount: 232,
        createdAt: new Date(),
      },
    ],
  },
];

describe("useHistoryOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with initial orders without autoFetch", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    expect(result.current.orders).toHaveLength(2);
    expect(result.current.filteredOrders).toHaveLength(2);
    expect(result.current.availableTables).toEqual(["Mesa 1"]);
    expect(result.current.isLoading).toBe(false);
  });

  it("filters orders by search query", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    act(() => {
      result.current.setFilter("searchQuery", "1001");
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].orderNumber).toBe("1001");
  });

  it("filters orders by table", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    act(() => {
      result.current.setFilter("tableFilter", "Mesa 1");
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].id).toBe("ord-1");
  });

  it("filters orders by payment method", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    act(() => {
      result.current.setFilter("paymentMethodFilter", PaymentMethod.CARD);
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].id).toBe("ord-2");
  });

  it("filters orders by source", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    act(() => {
      result.current.setFilter("sourceFilter", "PICKUP_APP");
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].source).toBe("PICKUP_APP");

    act(() => {
      result.current.setFilter("sourceFilter", "POS");
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0].source).toBe("POS");
  });

  it("resets filters cleanly", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    act(() => {
      result.current.setFilter("searchQuery", "nonexistent");
    });
    expect(result.current.filteredOrders).toHaveLength(0);

    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.filteredOrders).toHaveLength(2);
  });

  it("sorts orders by total asc/desc", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    act(() => {
      result.current.setSortField("total");
      result.current.setSortDir("asc");
    });

    expect(result.current.sortedOrders[0].total).toBe(116);
    expect(result.current.sortedOrders[1].total).toBe(232);

    act(() => {
      result.current.setSortDir("desc");
    });

    expect(result.current.sortedOrders[0].total).toBe(232);
    expect(result.current.sortedOrders[1].total).toBe(116);
  });

  it("sorts orders by orderNumber and table", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    act(() => {
      result.current.setSortField("orderNumber");
      result.current.setSortDir("desc");
    });
    expect(result.current.sortedOrders[0].orderNumber).toBe("1002");

    act(() => {
      result.current.setSortField("table");
      result.current.setSortDir("asc");
    });
    expect(result.current.sortedOrders[0].table).toBeUndefined();
  });

  it("handles toggling expanded row", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    expect(result.current.expandedRow).toBeNull();

    act(() => {
      result.current.toggleRow("ord-1");
    });
    expect(result.current.expandedRow).toBe("ord-1");

    act(() => {
      result.current.toggleRow("ord-1");
    });
    expect(result.current.expandedRow).toBeNull();
  });

  it("paginates orders correctly", () => {
    const { result } = renderHook(() =>
      useHistoryOrders({ initialOrders: mockOrders, autoFetch: false }),
    );

    act(() => {
      result.current.setPageSize(1);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedOrders).toHaveLength(1);
    expect(result.current.paginatedOrders[0].id).toBe("ord-2"); // default sort is createdAt desc

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.paginatedOrders[0].id).toBe("ord-1");
  });

  it("fetches orders via API on autoFetch", async () => {
    const mockApiResponse = {
      orders: [
        {
          id: "ord-api-1",
          order_number: "2001",
          source: "POS",
          status: "PAID",
          total: 100,
          created_at: "2026-09-01T12:00:00Z",
          updated_at: "2026-09-01T12:30:00Z",
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const { result } = renderHook(() => useHistoryOrders({ autoFetch: true }));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].orderNumber).toBe("2001");
    expect(result.current.errorMessage).toBeNull();
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Server exploded" }),
    });

    const { result } = renderHook(() => useHistoryOrders({ autoFetch: false }));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.errorMessage).toBe("Server exploded");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReportsData } from "../useReportsData";
import type { ReportData } from "../../types";

const mockReportData: ReportData = {
  period: "7days",
  summary: {
    totalSales: 10000,
    totalOrders: 50,
    averageTicket: 200,
    totalTips: 500,
    averageCompletionTimeMinutes: 8.5,
    totalExpenses: 4000,
    totalUncollected: 0,
  },
  salesByDay: {
    "2026-09-01": 6000,
    "2026-09-02": 4000,
  },
  ordersByDay: {
    "2026-09-01": 30,
    "2026-09-02": 20,
  },
  itemsByDay: {
    "2026-09-01": [{ name: "Cappuccino", quantity: 15, revenue: 1500 }],
  },
  salesBySource: {
    POS: { count: 40, total: 8000 },
    Delivery: { count: 10, total: 2000 },
  },
  topSellingItems: [{ name: "Cappuccino", quantity: 25, revenue: 2500 }],
  productSales: [
    { id: "1", name: "Cappuccino", category: "Bebidas", quantity: 25, revenue: 2500 },
    { id: "2", name: "Croissant", category: "Panadería", quantity: 10, revenue: 800 },
  ],
  customers: {
    topCustomers: [{ name: "Juan", totalSpend: 500, loyaltyPoints: 20 }],
    newCustomersCount: 3,
  },
};

describe("useReportsData Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize and autoFetch data on mount", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReportData,
    });

    const { result } = renderHook(() => useReportsData({ initialPeriod: "7days" }));

    expect(result.current.isLoading).toBe(true);

    // Esperar a que resuelva fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(mockReportData);
    expect(result.current.netUtility).toBe(6000); // 10000 - 4000
    expect(result.current.dailySalesData).toHaveLength(2);
    expect(result.current.enrichedProductSales).toHaveLength(2);
    expect(result.current.enrichedProductSales[0].rank).toBe(1);
  });

  it("should handle error response gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Error en base de datos" }),
    });

    const { result } = renderHook(() => useReportsData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBe("Error en base de datos");
    expect(result.current.data).toBeNull();
  });

  it("should switch period and trigger new fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReportData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useReportsData({ initialPeriod: "today" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/reports?period=today");

    await act(async () => {
      result.current.handlePeriodChange("month");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/reports?period=month");
    expect(result.current.period).toBe("month");
  });

  it("should handle custom date range application", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReportData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useReportsData({ initialPeriod: "custom", autoFetch: false }));

    act(() => {
      result.current.setCustomStartDate("2026-08-01");
      result.current.setCustomEndDate("2026-08-15");
    });

    await act(async () => {
      result.current.handleApplyCustomDates();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports?period=custom&startDate=2026-08-01&endDate=2026-08-15",
    );
  });

  it("should refresh data with refreshData", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReportData,
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useReportsData({ initialPeriod: "30days" }));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.refreshData();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

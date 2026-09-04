import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  ReportsProvider,
  useReportsContext,
  useReportsContextNullable,
} from "../ReportsContext";

describe("ReportsContext", () => {
  it("throws error when useReportsContext is used outside of ReportsProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useReportsContext())).toThrow(
      "useReportsContext must be used within a ReportsProvider"
    );

    consoleSpy.mockRestore();
  });

  it("returns null when useReportsContextNullable is used outside of ReportsProvider", () => {
    const { result } = renderHook(() => useReportsContextNullable());
    expect(result.current).toBeNull();
  });

  it("provides full context values and allows period/date updates", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: {},
        salesByDay: {},
        ordersByDay: {},
        itemsByDay: {},
        salesBySource: {},
        topSellingItems: [],
        productSales: [],
        customers: { topCustomers: [], newCustomersCount: 0 },
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReportsProvider autoFetch={false} initialPeriod="30days">
        {children}
      </ReportsProvider>
    );

    const { result } = renderHook(() => useReportsContext(), { wrapper });

    expect(result.current.period).toBe("30days");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.customStartDate).toBe("");
    expect(result.current.customEndDate).toBe("");

    act(() => {
      result.current.setCustomStartDate("2026-09-01");
      result.current.setCustomEndDate("2026-09-03");
    });

    expect(result.current.customStartDate).toBe("2026-09-01");
    expect(result.current.customEndDate).toBe("2026-09-03");

    await act(async () => {
      result.current.handlePeriodChange("month");
    });

    expect(result.current.period).toBe("month");

    // Call handleApplyCustomDates and refreshData without error
    await act(async () => {
      result.current.handleApplyCustomDates();
    });

    await act(async () => {
      result.current.refreshData();
    });
  });
});

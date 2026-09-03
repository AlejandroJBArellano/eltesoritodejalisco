import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDailyCutsArchive } from "../useDailyCutsArchive";
import type { DailyCut } from "../../types";

const mockCuts: DailyCut[] = [
  {
    id: "cut-1",
    cut_date: "2026-09-01",
    venta_neta: 1000,
    iva_acumulado: 160,
    propinas_efectivo: 50,
    propinas_tarjeta: 50,
    caja_efectivo: 1000,
    caja_tarjeta: 260,
    utilidad_real: 1100,
    total_gastos: 200,
    utilidad_final: 900,
    total_orders: 10,
    notes: null,
    expenses_detail: null,
    created_at: "2026-09-01T23:00:00Z",
  },
  {
    id: "cut-2",
    cut_date: "2026-09-02",
    venta_neta: 2000,
    iva_acumulado: 320,
    propinas_efectivo: 100,
    propinas_tarjeta: 100,
    caja_efectivo: 2000,
    caja_tarjeta: 520,
    utilidad_real: 2200,
    total_gastos: 400,
    utilidad_final: 1800,
    total_orders: 20,
    notes: null,
    expenses_detail: null,
    created_at: "2026-09-02T23:00:00Z",
  },
];

describe("useDailyCutsArchive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty cuts by default", () => {
    const { result } = renderHook(() => useDailyCutsArchive({ autoFetch: false }));
    expect(result.current.dailyCuts).toEqual([]);
    expect(result.current.isLoadingCuts).toBe(false);
  });

  it("sorts cuts by date, orders, venta_neta, and utilidad_final", () => {
    const { result } = renderHook(() => useDailyCutsArchive({ autoFetch: false }));

    act(() => {
      result.current.setDailyCuts(mockCuts);
      result.current.setCutsSortField("venta_neta");
      result.current.setCutsSortDir("asc");
    });

    expect(result.current.sortedDailyCuts[0].venta_neta).toBe(1000);
    expect(result.current.sortedDailyCuts[1].venta_neta).toBe(2000);

    act(() => {
      result.current.setCutsSortDir("desc");
    });
    expect(result.current.sortedDailyCuts[0].venta_neta).toBe(2000);

    act(() => {
      result.current.setCutsSortField("total_orders");
      result.current.setCutsSortDir("asc");
    });
    expect(result.current.sortedDailyCuts[0].total_orders).toBe(10);

    act(() => {
      result.current.setCutsSortField("utilidad_final");
      result.current.setCutsSortDir("desc");
    });
    expect(result.current.sortedDailyCuts[0].utilidad_final).toBe(1800);
  });

  it("paginates daily cuts correctly", () => {
    const { result } = renderHook(() => useDailyCutsArchive({ autoFetch: false }));

    act(() => {
      result.current.setDailyCuts(mockCuts);
      result.current.setCutsPageSize(1);
    });

    expect(result.current.cutsTotalPages).toBe(2);
    expect(result.current.paginatedDailyCuts).toHaveLength(1);

    act(() => {
      result.current.setCutsPage(2);
    });
    expect(result.current.paginatedDailyCuts[0].id).toBe("cut-1"); // sorted cut_date desc
  });

  it("handles selectedCutDetail state", () => {
    const { result } = renderHook(() => useDailyCutsArchive({ autoFetch: false }));

    expect(result.current.selectedCutDetail).toBeNull();

    act(() => {
      result.current.setSelectedCutDetail(mockCuts[0]);
    });
    expect(result.current.selectedCutDetail).toBe(mockCuts[0]);

    act(() => {
      result.current.setSelectedCutDetail(null);
    });
    expect(result.current.selectedCutDetail).toBeNull();
  });

  it("fetches cuts via API on refetch", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cuts: mockCuts }),
    });

    const { result } = renderHook(() => useDailyCutsArchive({ autoFetch: true }));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.dailyCuts).toHaveLength(2);
    expect(result.current.isLoadingCuts).toBe(false);
  });

  it("handles fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useDailyCutsArchive({ autoFetch: false }));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.dailyCuts).toEqual([]);
    expect(result.current.isLoadingCuts).toBe(false);
    consoleSpy.mockRestore();
  });
});

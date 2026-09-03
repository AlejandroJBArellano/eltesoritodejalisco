import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { HistoryProvider, useHistoryContext, useHistoryContextNullable } from "../HistoryContext";

vi.mock("@/hooks/usePendingCut", () => ({
  usePendingCut: () => ({
    loading: false,
    hasPendingCut: false,
    pendingDate: null,
    pendingOrders: 0,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [] }),
        }),
      }),
    }),
  }),
}));

describe("HistoryContext", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/tenant") {
        return { ok: true, json: async () => ({ tenant: { id: "tenant-1" } }) };
      }
      return { ok: false };
    });
  });
  it("throws error when useHistoryContext is called outside of HistoryProvider", () => {
    expect(() => renderHook(() => useHistoryContext())).toThrowError(
      "useHistoryContext must be used within a HistoryProvider",
    );
  });

  it("returns null when useHistoryContextNullable is called outside of HistoryProvider", () => {
    const { result } = renderHook(() => useHistoryContextNullable());
    expect(result.current).toBeNull();
  });

  it("provides values when inside HistoryProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <HistoryProvider autoFetch={false}>{children}</HistoryProvider>
    );

    const { result } = renderHook(() => useHistoryContext(), { wrapper });

    expect(result.current.orders).toEqual([]);
    expect(result.current.todayTotals).toBeDefined();
    expect(result.current.showCutsArchive).toBe(false);
  });
});

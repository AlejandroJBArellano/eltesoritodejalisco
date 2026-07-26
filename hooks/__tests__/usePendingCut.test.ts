import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePendingCut } from "../usePendingCut";

describe("usePendingCut Hook", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should fetch pending cut status on mount", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hasPendingCut: true,
        pendingDate: "2026-07-25",
        pendingOrders: 3,
      }),
    } as Response);

    const { result } = renderHook(() => usePendingCut());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise((res) => setTimeout(res, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.hasPendingCut).toBe(true);
    expect(result.current.pendingDate).toBe("2026-07-25");
    expect(result.current.pendingOrders).toBe(3);
  });

  it("should handle fetch error gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePendingCut());

    await act(async () => {
      await new Promise((res) => setTimeout(res, 10));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.hasPendingCut).toBe(false);
    expect(result.current.pendingDate).toBeNull();
    expect(result.current.pendingOrders).toBe(0);
  });
});

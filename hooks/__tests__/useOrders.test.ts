import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useOrderTimer,
  getElapsedSeconds,
  useRealtimeOrders,
} from "../useOrders";
import { OrderStatus, OrderWithDetails } from "@/types";

const realtimeCallbacks: {
  subscribe?: (status: string) => void;
  postgres?: (payload: { eventType: string }) => void;
} = {};

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: function (_event: string, _filter: unknown, cb: (payload: { eventType: string }) => void) {
        realtimeCallbacks.postgres = cb;
        return this;
      },
      subscribe: function (cb?: (status: string) => void) {
        realtimeCallbacks.subscribe = cb;
        return this;
      },
    }),
    removeChannel: vi.fn(),
  }),
}));

describe("useOrders Hook utilities & timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("getElapsedSeconds", () => {
    it("should return 0 when no date is provided", () => {
      expect(getElapsedSeconds(null)).toBe(0);
      expect(getElapsedSeconds(undefined)).toBe(0);
    });

    it("should calculate correct elapsed seconds from past date", () => {
      const now = new Date();
      const tenSecondsAgo = new Date(now.getTime() - 10000);
      expect(getElapsedSeconds(tenSecondsAgo)).toBe(10);
    });
  });

  describe("useOrderTimer", () => {
    it("should calculate elapsed seconds and update every second", () => {
      const startTime = new Date();
      const { result } = renderHook(() => useOrderTimer(startTime));

      expect(result.current).toBe(0);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current).toBe(5);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current).toBe(15);
    });

    it("should return static elapsed seconds and not tick if endTime is provided", () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 10000); // 10 seconds later
      const { result } = renderHook(() => useOrderTimer(startTime, endTime));

      expect(result.current).toBe(10);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should still be 10 seconds since it's static
      expect(result.current).toBe(10);
    });
  });

  describe("useRealtimeOrders", () => {
    it("should initialize with initial data provided", () => {
      const initialOrders: OrderWithDetails[] = [
        {
          id: "1",
          orderNumber: "101",
          source: "Mesa",
          status: OrderStatus.PENDING,
          subtotal: 50,
          tax: 0,
          total: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
          orderItems: [],
          payments: [],
        },
      ];

      const { result } = renderHook(() =>
        useRealtimeOrders(initialOrders, false, undefined, 0),
      );

      expect(result.current.orders.length).toBe(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should fetch orders periodically when polling interval is set", async () => {
      const globalFetch = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      } as Response);

      renderHook(() => useRealtimeOrders([], false, undefined, 5000));

      expect(globalFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(globalFetch).toHaveBeenCalledTimes(2);

      globalFetch.mockRestore();
    });

    it("should refetch orders when document becomes visible", async () => {
      const globalFetch = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      } as Response);

      renderHook(() => useRealtimeOrders([], false, undefined, 0));

      expect(globalFetch).toHaveBeenCalledTimes(1);

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });

      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(globalFetch).toHaveBeenCalledTimes(2);

      globalFetch.mockRestore();
    });

    it("should deduplicate document visibility listeners across multiple hook instances", async () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      const globalFetch = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      } as Response);

      const hook1 = renderHook(() =>
        useRealtimeOrders([], false, undefined, 0),
      );
      const hook2 = renderHook(() =>
        useRealtimeOrders([], false, undefined, 0),
      );

      const visibilityListenersCount = addEventListenerSpy.mock.calls.filter(
        ([event]) => event === "visibilitychange",
      ).length;

      expect(visibilityListenersCount).toBe(1);

      hook1.unmount();
      expect(
        removeEventListenerSpy.mock.calls.filter(
          ([event]) => event === "visibilitychange",
        ).length,
      ).toBe(0);

      hook2.unmount();
      expect(
        removeEventListenerSpy.mock.calls.filter(
          ([event]) => event === "visibilitychange",
        ).length,
      ).toBe(1);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
      globalFetch.mockRestore();
    });

    it("skips polling when Realtime is SUBSCRIBED or tab is hidden", async () => {
      const globalFetch = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      } as Response);

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });

      renderHook(() => useRealtimeOrders([], false, undefined, 5000));
      expect(globalFetch).toHaveBeenCalledTimes(1);

      act(() => {
        realtimeCallbacks.subscribe?.("SUBSCRIBED");
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(globalFetch).toHaveBeenCalledTimes(1);

      // Simulate disconnect (triggers 1 immediate reconnect fetch -> 2 calls total),
      // then hidden tab: advancing poll interval must NOT call fetchOrders again
      act(() => {
        realtimeCallbacks.subscribe?.("CHANNEL_ERROR");
      });
      expect(globalFetch).toHaveBeenCalledTimes(2);

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(globalFetch).toHaveBeenCalledTimes(2);

      // Visible + disconnected -> fallback polling triggers
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(globalFetch).toHaveBeenCalledTimes(3);

      globalFetch.mockRestore();
    });

    it("skips initial mount fetch when skipInitialFetch is true", () => {
      const globalFetch = vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ orders: [] }),
      } as Response);

      const { result } = renderHook(() =>
        useRealtimeOrders([], false, undefined, 0, true),
      );

      expect(globalFetch).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);

      globalFetch.mockRestore();
    });
  });
});

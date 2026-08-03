import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOrderTimer, getElapsedSeconds, useRealtimeOrders } from "../useOrders";
import { OrderStatus, OrderWithDetails } from "@/types";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: function () { return this; },
      subscribe: function () { return this; },
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

      const { result } = renderHook(() => useRealtimeOrders(initialOrders, false));

      expect(result.current.orders.length).toBe(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});

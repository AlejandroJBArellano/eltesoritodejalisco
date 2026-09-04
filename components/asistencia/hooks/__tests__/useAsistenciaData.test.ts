import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsistenciaData } from "../useAsistenciaData";
import type { AttendanceRecord, AttendanceUserOption } from "../../types";

const mockUsers: AttendanceUserOption[] = [
  { id: "u-1", name: "Carlos Mesero", role: "WAITER" },
  { id: "u-2", name: "Laura Cocinera", role: "CHEF" },
];

const mockAttendances: AttendanceRecord[] = [
  {
    id: "att-1",
    user_id: "u-1",
    date: "2026-09-03",
    check_in: "2026-09-03T15:00:00Z",
    check_out: null,
    status: "ACTIVE",
    users: { id: "u-1", name: "Carlos Mesero", role: "WAITER" },
  },
  {
    id: "att-2",
    user_id: "u-2",
    date: "2026-09-03",
    check_in: "2026-09-03T14:00:00Z",
    check_out: "2026-09-03T18:00:00Z",
    status: "FINISHED",
    users: { id: "u-2", name: "Laura Cocinera", role: "CHEF" },
  },
];

describe("useAsistenciaData Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads attendance and users on mount for admin user", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isAdmin: true,
        users: mockUsers,
        attendances: mockAttendances,
      }),
    });

    const { result } = renderHook(() => useAsistenciaData("12:00"));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.attendances).toEqual(mockAttendances);
    expect(result.current.customTime).toBe("12:00");
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Error de autenticación" }),
    });

    const { result } = renderHook(() => useAsistenciaData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Error de autenticación");
  });

  it("performs check-in action successfully and triggers refresh", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      callCount++;
      if (options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          isAdmin: true,
          users: mockUsers,
          attendances: mockAttendances,
        }),
      });
    });

    const { result } = renderHook(() => useAsistenciaData("10:30"));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.handleAction("CHECK_IN", "u-2");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining('"action":"CHECK_IN"'),
    });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles error during handleAction", async () => {
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      if (options?.method === "POST") {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Ya existe un turno activo" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          isAdmin: false,
          users: [],
          attendances: [],
        }),
      });
    });

    const { result } = renderHook(() => useAsistenciaData());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.handleAction("CHECK_IN");
    });

    expect(result.current.error).toBe("Ya existe un turno activo");
  });

  it("computes active attendance and employee hours accurately", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isAdmin: true,
        users: mockUsers,
        attendances: mockAttendances,
      }),
    });

    const { result } = renderHook(() => useAsistenciaData());

    await act(async () => {
      await Promise.resolve();
    });

    const activeU1 = result.current.getActiveAttendance("u-1");
    expect(activeU1?.id).toBe("att-1");

    const finishedU2 = result.current.getFinishedAttendances("u-2");
    expect(finishedU2).toHaveLength(1);

    const hoursU2 = result.current.getEmployeeHours("u-2");
    expect(hoursU2).toBe(4); // 14:00 to 18:00 = 4 hours

    expect(result.current.activeEmployeeAttendance?.id).toBe("att-1");
  });

  it("updates customTime and allows clearing error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isAdmin: false,
        users: [],
        attendances: [],
      }),
    });

    const { result } = renderHook(() => useAsistenciaData("09:00"));

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setCustomTime("11:15");
      result.current.setError("Custom error");
    });

    expect(result.current.customTime).toBe("11:15");
    expect(result.current.error).toBe("Custom error");

    act(() => {
      result.current.setError(null);
    });
    expect(result.current.error).toBeNull();
  });
});

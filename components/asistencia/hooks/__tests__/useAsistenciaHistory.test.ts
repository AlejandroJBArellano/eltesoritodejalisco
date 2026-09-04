import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsistenciaHistory } from "../useAsistenciaHistory";
import type { AttendanceRecord, AttendanceUserOption } from "../../types";

const mockUsers: AttendanceUserOption[] = [
  { id: "u-1", name: "Carlos Mesero", role: "WAITER" },
  { id: "u-2", name: "Laura Cocinera", role: "CHEF" },
];

const mockRecords: AttendanceRecord[] = [
  {
    id: "att-1",
    user_id: "u-1",
    date: "2026-09-01",
    check_in: "2026-09-01T15:00:00Z",
    check_out: "2026-09-01T20:00:00Z",
    status: "FINISHED",
    users: { id: "u-1", name: "Carlos Mesero", role: "WAITER" },
  },
  {
    id: "att-2",
    user_id: "u-2",
    date: "2026-09-02",
    check_in: "2026-09-02T14:00:00Z",
    check_out: null,
    status: "ACTIVE",
    users: { id: "u-2", name: "Laura Cocinera", role: "CHEF" },
  },
  {
    id: "att-3",
    user_id: "u-1",
    date: "2026-09-03",
    check_in: "2026-09-03T10:00:00Z",
    check_out: "2026-09-03T12:30:00Z",
    status: "FINISHED",
    users: { id: "u-1", name: "Carlos Mesero", role: "WAITER" },
  },
];

describe("useAsistenciaHistory Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches history and users on mount", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/history")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ attendances: mockRecords }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers }),
      });
    });

    const { result } = renderHook(() => useAsistenciaHistory());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.attendances).toEqual(mockRecords);
    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.activeCount).toBe(1);
    expect(result.current.totalHoursWorked).toBe(7.5); // 5h + 2.5h
  });

  it("filters attendances by searchQuery across name, role and date", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/history")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ attendances: mockRecords }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers }),
      });
    });

    const { result } = renderHook(() => useAsistenciaHistory());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setSearchQuery("laura");
    });

    expect(result.current.filteredAttendances).toHaveLength(1);
    expect(result.current.filteredAttendances[0].users?.name).toBe("Laura Cocinera");

    act(() => {
      result.current.setSearchQuery("2026-09-01");
    });

    expect(result.current.filteredAttendances).toHaveLength(1);
    expect(result.current.filteredAttendances[0].id).toBe("att-1");
  });

  it("sorts by various fields in asc and desc directions", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/history")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ attendances: mockRecords }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers }),
      });
    });

    const { result } = renderHook(() => useAsistenciaHistory());

    await act(async () => {
      await Promise.resolve();
    });

    // Default is sortField: "date", sortDirection: "desc"
    expect(result.current.sortedAttendances[0].date).toBe("2026-09-03");

    // Toggle same field -> changes to "asc"
    act(() => {
      result.current.handleSort("date");
    });
    expect(result.current.sortDirection).toBe("asc");
    expect(result.current.sortedAttendances[0].date).toBe("2026-09-01");

    // Change to duration
    act(() => {
      result.current.handleSort("duration");
    });
    expect(result.current.sortField).toBe("duration");
    expect(result.current.sortDirection).toBe("desc");
    expect(result.current.sortedAttendances[0].id).toBe("att-1"); // 5 hours

    // Change to name
    act(() => {
      result.current.handleSort("name");
    });
    expect(result.current.sortField).toBe("name");
    expect(result.current.sortedAttendances[0].users?.name).toBe("Laura Cocinera"); // desc: L before C

    // Change to role
    act(() => {
      result.current.handleSort("role");
    });
    expect(result.current.sortField).toBe("role");
    expect(result.current.sortedAttendances[0].users?.role).toBe("WAITER"); // desc: W before C

    // Change to status
    act(() => {
      result.current.handleSort("status");
    });
    expect(result.current.sortField).toBe("status");
    expect(result.current.sortedAttendances[0].status).toBe("FINISHED"); // desc: F after A

    // Change to check_in
    act(() => {
      result.current.handleSort("check_in");
    });
    expect(result.current.sortField).toBe("check_in");
  });

  it("handles pagination controls correctly", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/history")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ attendances: mockRecords }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ users: mockUsers }),
      });
    });

    const { result } = renderHook(() => useAsistenciaHistory());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setPageSize(2);
    });

    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedAttendances).toHaveLength(2);

    act(() => {
      result.current.setCurrentPage(2);
    });

    expect(result.current.paginatedAttendances).toHaveLength(1);
  });

  it("applies server-side filters and triggers fetchHistory", async () => {
    let requestedUrl = "";
    global.fetch = vi.fn().mockImplementation((url: string) => {
      requestedUrl = url;
      return Promise.resolve({
        ok: true,
        json: async () => ({ attendances: [] }),
      });
    });

    const { result } = renderHook(() => useAsistenciaHistory());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setSelectedUserId("u-1");
      result.current.setStartDate("2026-09-01");
      result.current.setEndDate("2026-09-03");
    });

    await act(async () => {
      result.current.handleApplyFilters();
    });

    expect(requestedUrl).toContain("userId=u-1");
    expect(requestedUrl).toContain("startDate=2026-09-01");
    expect(requestedUrl).toContain("endDate=2026-09-03");
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Error de servidor al obtener historial" }),
    });

    const { result } = renderHook(() => useAsistenciaHistory());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe("Error de servidor al obtener historial");
  });
});

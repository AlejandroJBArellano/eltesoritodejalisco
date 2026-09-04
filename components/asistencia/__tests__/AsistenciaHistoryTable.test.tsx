import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AsistenciaHistoryTable } from "../AsistenciaHistoryTable";
import * as HistoryContextModule from "../AsistenciaHistoryContext";
import type { AttendanceRecord } from "../types";

const mockRecord: AttendanceRecord = {
  id: "rec-1",
  user_id: "u-1",
  date: "2026-09-03",
  check_in: "2026-09-03T15:00:00Z",
  check_out: "2026-09-03T23:00:00Z",
  status: "FINISHED",
  users: {
    id: "u-1",
    name: "Esteban Quito",
    email: "esteban@test.com",
    role: "WAITER",
  },
};

describe("AsistenciaHistoryTable Component", () => {
  it("renders table with records and handles sorting", () => {
    const handleSortMock = vi.fn();
    const setCurrentPageMock = vi.fn();
    const setPageSizeMock = vi.fn();

    vi.spyOn(
      HistoryContextModule,
      "useAsistenciaHistoryContext",
    ).mockReturnValue({
      attendances: [mockRecord],
      users: [],
      isLoading: false,
      error: null,
      selectedUserId: "ALL",
      setSelectedUserId: vi.fn(),
      startDate: "",
      setStartDate: vi.fn(),
      endDate: "",
      setEndDate: vi.fn(),
      searchQuery: "",
      setSearchQuery: vi.fn(),
      sortField: "date",
      sortDirection: "desc",
      currentPage: 1,
      setCurrentPage: setCurrentPageMock,
      pageSize: 10,
      setPageSize: setPageSizeMock,
      totalPages: 1,
      filteredAttendances: [mockRecord],
      sortedAttendances: [mockRecord],
      paginatedAttendances: [mockRecord],
      totalHoursWorked: 8,
      activeCount: 0,
      handleApplyFilters: vi.fn(),
      handleSort: handleSortMock,
      fetchHistory: vi.fn(),
      fetchUsers: vi.fn(),
    });

    render(<AsistenciaHistoryTable />);

    expect(screen.getByText("Esteban Quito")).toBeInTheDocument();
    expect(screen.getByText("WAITER")).toBeInTheDocument();
    expect(screen.getByText("2026-09-03")).toBeInTheDocument();
    expect(screen.getByText("09:00:00")).toBeInTheDocument();
    expect(screen.getByText("17:00:00")).toBeInTheDocument();
    expect(screen.getByText("8h 0m")).toBeInTheDocument();
    expect(screen.getByText("Finalizado")).toBeInTheDocument();

    const empHeader = screen.getByText("Empleado");
    fireEvent.click(empHeader);
    expect(handleSortMock).toHaveBeenCalledWith("name");
  });

  it("renders empty state message when no records match", () => {
    vi.spyOn(
      HistoryContextModule,
      "useAsistenciaHistoryContext",
    ).mockReturnValue({
      attendances: [],
      users: [],
      isLoading: false,
      error: null,
      selectedUserId: "ALL",
      setSelectedUserId: vi.fn(),
      startDate: "",
      setStartDate: vi.fn(),
      endDate: "",
      setEndDate: vi.fn(),
      searchQuery: "",
      setSearchQuery: vi.fn(),
      sortField: "date",
      sortDirection: "desc",
      currentPage: 1,
      setCurrentPage: vi.fn(),
      pageSize: 10,
      setPageSize: vi.fn(),
      totalPages: 1,
      filteredAttendances: [],
      sortedAttendances: [],
      paginatedAttendances: [],
      totalHoursWorked: 0,
      activeCount: 0,
      handleApplyFilters: vi.fn(),
      handleSort: vi.fn(),
      fetchHistory: vi.fn(),
      fetchUsers: vi.fn(),
    });

    render(<AsistenciaHistoryTable />);

    expect(
      screen.getByText(
        "No se encontraron registros de asistencia con los filtros seleccionados.",
      ),
    ).toBeInTheDocument();
  });

  it("renders loading state", () => {
    vi.spyOn(
      HistoryContextModule,
      "useAsistenciaHistoryContext",
    ).mockReturnValue({
      attendances: [],
      users: [],
      isLoading: true,
      error: null,
      selectedUserId: "ALL",
      setSelectedUserId: vi.fn(),
      startDate: "",
      setStartDate: vi.fn(),
      endDate: "",
      setEndDate: vi.fn(),
      searchQuery: "",
      setSearchQuery: vi.fn(),
      sortField: "date",
      sortDirection: "desc",
      currentPage: 1,
      setCurrentPage: vi.fn(),
      pageSize: 10,
      setPageSize: vi.fn(),
      totalPages: 1,
      filteredAttendances: [],
      sortedAttendances: [],
      paginatedAttendances: [],
      totalHoursWorked: 0,
      activeCount: 0,
      handleApplyFilters: vi.fn(),
      handleSort: vi.fn(),
      fetchHistory: vi.fn(),
      fetchUsers: vi.fn(),
    });

    render(<AsistenciaHistoryTable />);

    expect(
      screen.getByText("Cargando historial de asistencias..."),
    ).toBeInTheDocument();
  });

  it("renders error state", () => {
    vi.spyOn(
      HistoryContextModule,
      "useAsistenciaHistoryContext",
    ).mockReturnValue({
      attendances: [],
      users: [],
      isLoading: false,
      error: "Fallo de conexión a la base de datos",
      selectedUserId: "ALL",
      setSelectedUserId: vi.fn(),
      startDate: "",
      setStartDate: vi.fn(),
      endDate: "",
      setEndDate: vi.fn(),
      searchQuery: "",
      setSearchQuery: vi.fn(),
      sortField: "date",
      sortDirection: "desc",
      currentPage: 1,
      setCurrentPage: vi.fn(),
      pageSize: 10,
      setPageSize: vi.fn(),
      totalPages: 1,
      filteredAttendances: [],
      sortedAttendances: [],
      paginatedAttendances: [],
      totalHoursWorked: 0,
      activeCount: 0,
      handleApplyFilters: vi.fn(),
      handleSort: vi.fn(),
      fetchHistory: vi.fn(),
      fetchUsers: vi.fn(),
    });

    render(<AsistenciaHistoryTable />);

    expect(
      screen.getByText("Fallo de conexión a la base de datos"),
    ).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AsistenciaSummaryKPIs } from "../AsistenciaSummaryKPIs";
import * as HistoryContextModule from "../AsistenciaHistoryContext";

describe("AsistenciaSummaryKPIs Component", () => {
  it("renders 3 KPI cards with accurate formatted metrics", () => {
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
      filteredAttendances: [
        {
          id: "1",
          user_id: "u1",
          date: "2026-09-03",
          check_in: "2026-09-03T10:00:00Z",
          check_out: "2026-09-03T18:00:00Z",
          status: "FINISHED",
        },
      ],
      sortedAttendances: [],
      paginatedAttendances: [],
      totalHoursWorked: 8.5,
      activeCount: 3,
      handleApplyFilters: vi.fn(),
      handleSort: vi.fn(),
      fetchHistory: vi.fn(),
      fetchUsers: vi.fn(),
    });

    render(<AsistenciaSummaryKPIs />);

    expect(screen.getByText("Total Registros")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    expect(screen.getByText("Horas Totales Trabajadas")).toBeInTheDocument();
    expect(screen.getByText("8.5 hrs")).toBeInTheDocument();

    expect(screen.getByText("Turnos Activos Ahora")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

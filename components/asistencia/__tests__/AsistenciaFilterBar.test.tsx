import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AsistenciaFilterBar } from "../AsistenciaFilterBar";
import * as HistoryContextModule from "../AsistenciaHistoryContext";

describe("AsistenciaFilterBar Component", () => {
  it("renders filters and handles user interactions", () => {
    const setSelectedUserIdMock = vi.fn();
    const setStartDateMock = vi.fn();
    const setEndDateMock = vi.fn();
    const setSearchQueryMock = vi.fn();
    const handleApplyFiltersMock = vi.fn();

    vi.spyOn(
      HistoryContextModule,
      "useAsistenciaHistoryContext",
    ).mockReturnValue({
      attendances: [],
      users: [
        { id: "u-1", name: "Mario Lopez", role: "WAITER" },
        { id: "u-2", name: "Rosa Diaz", role: "CHEF" },
      ],
      isLoading: false,
      error: null,
      selectedUserId: "ALL",
      setSelectedUserId: setSelectedUserIdMock,
      startDate: "2026-09-01",
      setStartDate: setStartDateMock,
      endDate: "2026-09-03",
      setEndDate: setEndDateMock,
      searchQuery: "",
      setSearchQuery: setSearchQueryMock,
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
      handleApplyFilters: handleApplyFiltersMock,
      handleSort: vi.fn(),
      fetchHistory: vi.fn(),
      fetchUsers: vi.fn(),
    });

    render(<AsistenciaFilterBar />);

    expect(screen.getByText("Filtros del Historial")).toBeInTheDocument();

    // Empleado select
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "u-1" } });
    expect(setSelectedUserIdMock).toHaveBeenCalledWith("u-1");

    // Fecha inputs
    const dateInputs = screen.getAllByDisplayValue(/2026-09/);
    expect(dateInputs).toHaveLength(2);
    fireEvent.change(dateInputs[0], { target: { value: "2026-09-02" } });
    expect(setStartDateMock).toHaveBeenCalledWith("2026-09-02");

    fireEvent.change(dateInputs[1], { target: { value: "2026-09-04" } });
    expect(setEndDateMock).toHaveBeenCalledWith("2026-09-04");

    // Filtrar button
    const filterBtn = screen.getByRole("button", { name: /filtrar/i });
    fireEvent.click(filterBtn);
    expect(handleApplyFiltersMock).toHaveBeenCalled();

    // Export button
    expect(screen.getByRole("button", { name: /exportar/i })).toBeInTheDocument();
  });
});

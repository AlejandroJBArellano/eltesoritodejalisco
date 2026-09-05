import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DailyCutsArchiveTable } from "../DailyCutsArchiveTable";
import type { DailyCut } from "../types";

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
    comision_tarjeta: 0,
    utilidad_real: 1100,
    total_gastos: 200,
    utilidad_final: 900,
    total_orders: 10,
    notes: null,
    expenses_detail: null,
    created_at: "2026-09-01T23:00:00Z",
  },
];

describe("DailyCutsArchiveTable Component", () => {
  it("renders loading state", () => {
    render(
      <DailyCutsArchiveTable
        dailyCuts={[]}
        sortedDailyCuts={[]}
        paginatedDailyCuts={[]}
        isLoadingCuts={true}
        cutsSortField="cut_date"
        cutsSortDir="desc"
        cutsPage={1}
        cutsPageSize={10}
        cutsTotalPages={1}
        onSort={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onViewCutDetail={vi.fn()}
      />,
    );

    expect(screen.getByText("Cargando archivo de cortes...")).toBeDefined();
  });

  it("renders empty state", () => {
    render(
      <DailyCutsArchiveTable
        dailyCuts={[]}
        sortedDailyCuts={[]}
        paginatedDailyCuts={[]}
        isLoadingCuts={false}
        cutsSortField="cut_date"
        cutsSortDir="desc"
        cutsPage={1}
        cutsPageSize={10}
        cutsTotalPages={1}
        onSort={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onViewCutDetail={vi.fn()}
      />,
    );

    expect(screen.getByText("No hay cortes registrados aún.")).toBeDefined();
  });

  it("renders cuts rows and triggers onViewCutDetail", () => {
    const onViewCutDetail = vi.fn();
    render(
      <DailyCutsArchiveTable
        dailyCuts={mockCuts}
        sortedDailyCuts={mockCuts}
        paginatedDailyCuts={mockCuts}
        isLoadingCuts={false}
        cutsSortField="cut_date"
        cutsSortDir="desc"
        cutsPage={1}
        cutsPageSize={10}
        cutsTotalPages={1}
        onSort={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onViewCutDetail={onViewCutDetail}
      />,
    );

    expect(screen.getByText("Comisión")).toBeDefined();
    expect(screen.getByText("$1000.00")).toBeDefined();
    expect(screen.getByText("$1160.00")).toBeDefined(); // Venta Bruta
    expect(screen.getByText("$900.00")).toBeDefined(); // Utilidad final

    const viewBtn = screen.getByText("Ver");
    fireEvent.click(viewBtn);
    expect(onViewCutDetail).toHaveBeenCalledWith(mockCuts[0]);
  });
});

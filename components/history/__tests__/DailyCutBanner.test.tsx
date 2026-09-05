import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DailyCutBanner } from "../DailyCutBanner";
import type { DailyCutSummaryTotals } from "../types";

const mockTotals: DailyCutSummaryTotals = {
  ventaNeta: 1000,
  ivaAcumulado: 160,
  propinasEfectivo: 50,
  propinasTarjeta: 50,
  cajaEfectivo: 1050,
  cajaTarjeta: 210,
  comisionTarjeta: 0,
  cajaTarjetaNeta: 210,
  utilidadReal: 1100,
  utilidadFinal: 800,
  ordersAtTable: 3,
  ordersDelivery: 2,
  averageTicket: 232,
};

describe("DailyCutBanner Component", () => {
  it("renders today totals and metrics", () => {
    render(
      <DailyCutBanner
        todayTotals={mockTotals}
        todayOrdersCount={5}
        todayExpenses={300}
        finalizeSuccess={false}
        hasPendingCut={false}
        pendingDate={null}
        pendingOrders={0}
        pendingCutArmed={false}
        isGeneratingPendingCut={false}
        showCutsArchive={false}
        historyError={null}
        historySuccess={null}
        onFinalizeDayClick={vi.fn()}
        onToggleCutsArchive={vi.fn()}
        onGeneratePendingCut={vi.fn()}
      />,
    );

    expect(screen.getByText("Corte de Caja Diario")).toBeDefined();
    expect(screen.getByText("$1000.00")).toBeDefined(); // Venta Neta
    expect(screen.getByText("$160.00")).toBeDefined(); // IVA
    expect(screen.getByText("$1050.00")).toBeDefined(); // Caja Efectivo
    expect(screen.getByText("-$300.00")).toBeDefined(); // Gastos
    expect(screen.getByText("$800.00")).toBeDefined(); // Utilidad Final
    expect(screen.getByText("5")).toBeDefined(); // 5 órdenes hoy
  });

  it("handles finalize day click", () => {
    const onFinalizeDayClick = vi.fn();
    render(
      <DailyCutBanner
        todayTotals={mockTotals}
        todayOrdersCount={5}
        todayExpenses={300}
        finalizeSuccess={false}
        hasPendingCut={false}
        pendingDate={null}
        pendingOrders={0}
        pendingCutArmed={false}
        isGeneratingPendingCut={false}
        showCutsArchive={false}
        historyError={null}
        historySuccess={null}
        onFinalizeDayClick={onFinalizeDayClick}
        onToggleCutsArchive={vi.fn()}
        onGeneratePendingCut={vi.fn()}
      />,
    );

    const finalizeBtn = screen.getByText("Finalizar Día");
    fireEvent.click(finalizeBtn);
    expect(onFinalizeDayClick).toHaveBeenCalled();
  });

  it("shows pending cut alert when hasPendingCut is true", () => {
    const onGeneratePendingCut = vi.fn();
    render(
      <DailyCutBanner
        todayTotals={mockTotals}
        todayOrdersCount={5}
        todayExpenses={300}
        finalizeSuccess={false}
        hasPendingCut={true}
        pendingDate="2026-09-02"
        pendingOrders={4}
        pendingCutArmed={false}
        isGeneratingPendingCut={false}
        showCutsArchive={false}
        historyError={null}
        historySuccess={null}
        onFinalizeDayClick={vi.fn()}
        onToggleCutsArchive={vi.fn()}
        onGeneratePendingCut={onGeneratePendingCut}
      />,
    );

    expect(
      screen.getByText("Corte Pendiente Detectado (2026-09-02)"),
    ).toBeDefined();

    const closeBtn = screen.getByText("Cerrar Ayer Ahora");
    fireEvent.click(closeBtn);
    expect(onGeneratePendingCut).toHaveBeenCalled();
  });

  it("renders finalizeSuccess view with zeroed numbers", () => {
    render(
      <DailyCutBanner
        todayTotals={mockTotals}
        todayOrdersCount={0}
        todayExpenses={0}
        finalizeSuccess={true}
        hasPendingCut={false}
        pendingDate={null}
        pendingOrders={0}
        pendingCutArmed={false}
        isGeneratingPendingCut={false}
        showCutsArchive={false}
        historyError={null}
        historySuccess="¡Día cerrado!"
        onFinalizeDayClick={vi.fn()}
        onToggleCutsArchive={vi.fn()}
        onGeneratePendingCut={vi.fn()}
      />,
    );

    expect(screen.getByText("Día Finalizado")).toBeDefined();
    expect(screen.getByText("¡Día cerrado!")).toBeDefined();
    expect(screen.queryByText("Finalizar Día")).toBeNull();
  });

  it("toggles cuts archive button correctly", () => {
    const onToggleCutsArchive = vi.fn();
    const { rerender } = render(
      <DailyCutBanner
        todayTotals={mockTotals}
        todayOrdersCount={5}
        todayExpenses={300}
        finalizeSuccess={false}
        hasPendingCut={false}
        pendingDate={null}
        pendingOrders={0}
        pendingCutArmed={false}
        isGeneratingPendingCut={false}
        showCutsArchive={false}
        historyError={null}
        historySuccess={null}
        onFinalizeDayClick={vi.fn()}
        onToggleCutsArchive={onToggleCutsArchive}
        onGeneratePendingCut={vi.fn()}
      />,
    );

    const toggleBtn = screen.getByText("Archivo de Cortes");
    fireEvent.click(toggleBtn);
    expect(onToggleCutsArchive).toHaveBeenCalled();

    rerender(
      <DailyCutBanner
        todayTotals={mockTotals}
        todayOrdersCount={5}
        todayExpenses={300}
        finalizeSuccess={false}
        hasPendingCut={false}
        pendingDate={null}
        pendingOrders={0}
        pendingCutArmed={false}
        isGeneratingPendingCut={false}
        showCutsArchive={true}
        historyError="Algo salió mal"
        historySuccess={null}
        onFinalizeDayClick={vi.fn()}
        onToggleCutsArchive={onToggleCutsArchive}
        onGeneratePendingCut={vi.fn()}
      />,
    );

    expect(screen.getByText("Ocultar Archivo")).toBeDefined();
    expect(screen.getByText("Algo salió mal")).toBeDefined();
  });

  it("displays commission deduction and net amount when todayTotals has comisionTarjeta > 0", () => {
    const totalsWithCommission: DailyCutSummaryTotals = {
      ...mockTotals,
      cajaTarjeta: 1000,
      comisionTarjeta: 40.6,
      cajaTarjetaNeta: 959.4,
    };

    render(
      <DailyCutBanner
        todayTotals={totalsWithCommission}
        todayOrdersCount={5}
        todayExpenses={300}
      />,
    );

    expect(screen.getByText(/Comisión: -\$40\.60 · Neto: \$959\.40/i)).toBeDefined();
  });
});

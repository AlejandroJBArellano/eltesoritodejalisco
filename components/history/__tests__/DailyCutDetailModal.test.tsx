import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DailyCutDetailModal } from "../DailyCutDetailModal";
import type { DailyCut } from "../types";

const mockCut: DailyCut = {
  id: "cut-1",
  cut_date: "2026-09-01",
  venta_neta: 1200,
  iva_acumulado: 192,
  propinas_efectivo: 60,
  propinas_tarjeta: 40,
  caja_efectivo: 1260,
  caja_tarjeta: 232,
  comision_tarjeta: 0,
  utilidad_real: 1300,
  total_gastos: 250,
  utilidad_final: 1050,
  total_orders: 12,
  notes: null,
  expenses_detail: [
    {
      description: "Carne para birria",
      amount: 250,
      category: "Insumos",
      has_invoice: true,
    },
  ],
  created_at: "2026-09-01T23:00:00Z",
};

describe("DailyCutDetailModal Component", () => {
  it("renders null when cut is null", () => {
    const { container } = render(
      <DailyCutDetailModal cut={null} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders cut metrics and expense breakdown", () => {
    const onClose = vi.fn();
    render(<DailyCutDetailModal cut={mockCut} onClose={onClose} />);

    expect(screen.getByText("Detalle del Corte")).toBeDefined();
    expect(screen.getByText("$1200.00")).toBeDefined();
    expect(screen.getByText("$192.00")).toBeDefined();
    expect(screen.getByText("$1050.00")).toBeDefined();
    expect(screen.getByText("Carne para birria")).toBeDefined();
    expect(screen.getByText("(Insumos)")).toBeDefined();
    expect(screen.getByText("FAC")).toBeDefined();

    const closeBtn = screen.getByText("Cerrar");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders commission and net card amount when comision_tarjeta > 0", () => {
    const cutWithCommission: DailyCut = {
      ...mockCut,
      caja_tarjeta: 1000,
      comision_tarjeta: 40.6,
    };

    render(<DailyCutDetailModal cut={cutWithCommission} onClose={vi.fn()} />);

    expect(screen.getByText(/Comisión: -\$40\.60 · Neto: \$959\.40/i)).toBeDefined();
  });
});

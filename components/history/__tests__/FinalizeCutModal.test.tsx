import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FinalizeCutModal } from "../FinalizeCutModal";
import type { DailyCutSummaryTotals } from "../types";

const mockTotals: DailyCutSummaryTotals = {
  ventaNeta: 1500,
  ivaAcumulado: 240,
  propinasEfectivo: 50,
  propinasTarjeta: 50,
  cajaEfectivo: 1000,
  cajaTarjeta: 790,
  comisionTarjeta: 0,
  cajaTarjetaNeta: 790,
  utilidadReal: 1600,
  utilidadFinal: 1400,
  ordersAtTable: 5,
  ordersDelivery: 1,
  averageTicket: 290,
  creditoOtorgadoHoy: 0,
};

describe("FinalizeCutModal Component", () => {
  it("renders null when isOpen is false", () => {
    const { container } = render(
      <FinalizeCutModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isFinalizing={false}
        todayTotals={mockTotals}
        todayOrdersCount={6}
        todayExpenses={200}
        manualCash="1000"
        manualCard="790"
        manualTipsEfectivo="50"
        manualTipsTarjeta="50"
        onManualCashChange={vi.fn()}
        onManualCardChange={vi.fn()}
        onManualTipsEfectivoChange={vi.fn()}
        onManualTipsTarjetaChange={vi.fn()}
        isCalculatingTips={false}
        tipBreakdown={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders inputs, totals and triggers handlers for all inputs", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const onManualCashChange = vi.fn();
    const onManualCardChange = vi.fn();
    const onManualTipsEfectivoChange = vi.fn();
    const onManualTipsTarjetaChange = vi.fn();

    render(
      <FinalizeCutModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isFinalizing={false}
        todayTotals={mockTotals}
        todayOrdersCount={6}
        todayExpenses={200}
        manualCash="1000"
        manualCard="790"
        manualTipsEfectivo="50"
        manualTipsTarjeta="50"
        onManualCashChange={onManualCashChange}
        onManualCardChange={onManualCardChange}
        onManualTipsEfectivoChange={onManualTipsEfectivoChange}
        onManualTipsTarjetaChange={onManualTipsTarjetaChange}
        isCalculatingTips={false}
        tipBreakdown={[
          { employee_name: "Carlos", hours_worked: 6, tip_amount: 50 },
        ]}
      />,
    );

    expect(screen.getByText("Finalizar Día")).toBeDefined();
    expect(screen.getByText("$1500.00")).toBeDefined();
    expect(screen.getByText("-$200.00")).toBeDefined();
    expect(screen.getByText("Carlos")).toBeDefined();
    expect(screen.getByText("6.00h")).toBeDefined();

    // Trigger input change for cash
    const cashInput = screen.getByDisplayValue("1000");
    fireEvent.change(cashInput, { target: { value: "1100" } });
    expect(onManualCashChange).toHaveBeenCalledWith("1100");

    // Trigger input change for card
    const cardInput = screen.getByDisplayValue("790");
    fireEvent.change(cardInput, { target: { value: "800" } });
    expect(onManualCardChange).toHaveBeenCalledWith("800");

    // Trigger input change for tips cash and card
    const tipsInputs = screen.getAllByDisplayValue("50");
    fireEvent.change(tipsInputs[0], { target: { value: "60" } });
    expect(onManualTipsEfectivoChange).toHaveBeenCalledWith("60");

    fireEvent.change(tipsInputs[1], { target: { value: "70" } });
    expect(onManualTipsTarjetaChange).toHaveBeenCalledWith("70");

    // Trigger confirm
    const confirmBtn = screen.getByText("Confirmar y Finalizar");
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();

    // Trigger cancel
    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("displays calculating tips message when isCalculatingTips is true", () => {
    render(
      <FinalizeCutModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isFinalizing={false}
        todayTotals={mockTotals}
        todayOrdersCount={6}
        todayExpenses={200}
        manualCash="1000"
        manualCard="790"
        manualTipsEfectivo="50"
        manualTipsTarjeta="50"
        onManualCashChange={vi.fn()}
        onManualCardChange={vi.fn()}
        onManualTipsEfectivoChange={vi.fn()}
        onManualTipsTarjetaChange={vi.fn()}
        isCalculatingTips={true}
        tipBreakdown={[]}
      />,
    );

    expect(screen.getByText("Calculando...")).toBeDefined();
  });

  it("displays terminal commission deduction and net card amount when terminalCommissionRate > 0", () => {
    render(
      <FinalizeCutModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isFinalizing={false}
        todayTotals={mockTotals}
        todayOrdersCount={6}
        todayExpenses={200}
        manualCash="1000"
        manualCard="1000"
        manualTipsEfectivo="50"
        manualTipsTarjeta="50"
        terminalCommissionRate={4}
      />,
    );

    // Rate 4% on $1,000 card = $40.00 commission, $960.00 net
    expect(screen.getByText(/Comisión \(4.00%\)/i)).toBeDefined();
    expect(screen.getByText("-$40.00")).toBeDefined();
    expect(screen.getByText(/Neto: \$960.00/i)).toBeDefined();
  });

  it("renders Crédito otorgado hoy row when creditoOtorgadoHoy > 0", () => {
    const totalsWithCredit: DailyCutSummaryTotals = {
      ...mockTotals,
      creditoOtorgadoHoy: 450,
    };

    render(
      <FinalizeCutModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        todayTotals={totalsWithCredit}
      />,
    );

    expect(screen.getByText("Crédito otorgado hoy")).toBeDefined();
    expect(screen.getByText("$450.00")).toBeDefined();
  });
});

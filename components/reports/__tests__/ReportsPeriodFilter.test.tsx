import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportsPeriodFilter } from "../ReportsPeriodFilter";

describe("ReportsPeriodFilter Component", () => {
  it("renders all period pill buttons and calls onPeriodChange", () => {
    const handlePeriodChange = vi.fn();
    render(
      <ReportsPeriodFilter
        period="7days"
        onPeriodChange={handlePeriodChange}
        customStartDate=""
        customEndDate=""
        onCustomStartDateChange={vi.fn()}
        onCustomEndDateChange={vi.fn()}
        onApplyCustomDates={vi.fn()}
      />,
    );

    expect(screen.getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText("Ayer")).toBeInTheDocument();
    expect(screen.getByText("Últimos 7 días")).toBeInTheDocument();
    expect(screen.getByText("Mes Actual")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hoy"));
    expect(handlePeriodChange).toHaveBeenCalledWith("today");
  });

  it("renders custom date controls when period is custom", () => {
    const handleStartDateChange = vi.fn();
    const handleEndDateChange = vi.fn();
    const handleApplyCustomDates = vi.fn();

    render(
      <ReportsPeriodFilter
        period="custom"
        onPeriodChange={vi.fn()}
        customStartDate="2026-08-01"
        customEndDate="2026-08-15"
        onCustomStartDateChange={handleStartDateChange}
        onCustomEndDateChange={handleEndDateChange}
        onApplyCustomDates={handleApplyCustomDates}
      />,
    );

    const startInput = screen.getByLabelText("Desde:");
    const endInput = screen.getByLabelText("Hasta:");
    const applyBtn = screen.getByText("Aplicar Rango");

    expect(startInput).toHaveValue("2026-08-01");
    expect(endInput).toHaveValue("2026-08-15");

    fireEvent.change(startInput, { target: { value: "2026-08-05" } });
    expect(handleStartDateChange).toHaveBeenCalledWith("2026-08-05");

    fireEvent.change(endInput, { target: { value: "2026-08-20" } });
    expect(handleEndDateChange).toHaveBeenCalledWith("2026-08-20");

    fireEvent.click(applyBtn);
    expect(handleApplyCustomDates).toHaveBeenCalled();
  });
});

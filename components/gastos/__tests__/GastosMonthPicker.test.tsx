import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GastosMonthPicker } from "../GastosMonthPicker";

describe("GastosMonthPicker Component", () => {
  it("renders labels and month input with correct value", () => {
    const onMonthChange = vi.fn();
    render(
      <GastosMonthPicker
        currentMonth="2026-09"
        onMonthChange={onMonthChange}
      />,
    );

    expect(screen.getByText("Resumen Financiero")).toBeInTheDocument();
    expect(screen.getByText("Control de Egresos y Balance")).toBeInTheDocument();

    const input = screen.getByLabelText("Seleccionar mes") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("2026-09");
  });

  it("calls onMonthChange when user changes the month", () => {
    const onMonthChange = vi.fn();
    render(
      <GastosMonthPicker
        currentMonth="2026-09"
        onMonthChange={onMonthChange}
      />,
    );

    const input = screen.getByLabelText("Seleccionar mes");
    fireEvent.change(input, { target: { value: "2026-08" } });

    expect(onMonthChange).toHaveBeenCalledWith("2026-08");
  });
});

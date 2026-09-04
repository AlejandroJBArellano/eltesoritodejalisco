import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminControlsBar } from "../AdminControlsBar";

describe("AdminControlsBar Component", () => {
  it("renders admin title, explanation and time input", () => {
    const onTimeChangeMock = vi.fn();
    render(
      <AdminControlsBar
        customTime="10:45"
        onCustomTimeChange={onTimeChangeMock}
      />,
    );

    expect(screen.getByText("Modo Administrador")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Puedes registrar entradas o salidas manuales usando una hora personalizada.",
      ),
    ).toBeInTheDocument();

    const input = screen.getByDisplayValue("10:45");
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "11:30" } });
    expect(onTimeChangeMock).toHaveBeenCalledWith("11:30");
  });
});

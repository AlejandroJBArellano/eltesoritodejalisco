import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminTareasNav } from "../AdminTareasNav";

describe("AdminTareasNav Component", () => {
  it("renders tab buttons and handles tab change", () => {
    const onTabChangeMock = vi.fn();
    render(
      <AdminTareasNav
        activeTab="history"
        onTabChange={onTabChangeMock}
        selectedDate="2026-09-03"
      />,
    );

    expect(screen.getByText(/📋 Historial/i)).toBeInTheDocument();
    expect(screen.getByText(/📊 Rendimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/⚙️ Configuración/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/📊 Rendimiento/i));
    expect(onTabChangeMock).toHaveBeenCalledWith("performance");

    fireEvent.click(screen.getByText(/⚙️ Configuración/i));
    expect(onTabChangeMock).toHaveBeenCalledWith("config");
  });

  it("renders date input when tab is not config and handles date change", () => {
    const onDateChangeMock = vi.fn();
    render(
      <AdminTareasNav
        activeTab="history"
        selectedDate="2026-09-03"
        onDateChange={onDateChangeMock}
      />,
    );

    const dateInput = screen.getByDisplayValue("2026-09-03");
    expect(dateInput).toBeInTheDocument();
    fireEvent.change(dateInput, { target: { value: "2026-09-04" } });
    expect(onDateChangeMock).toHaveBeenCalledWith("2026-09-04");
  });

  it("renders action buttons when tab is config and triggers modals", () => {
    const onOpenCatMock = vi.fn();
    const onOpenTaskMock = vi.fn();

    render(
      <AdminTareasNav
        activeTab="config"
        onOpenCategoryModal={onOpenCatMock}
        onOpenNewTaskModal={onOpenTaskMock}
      />,
    );

    const catBtn = screen.getByRole("button", { name: /nueva categoría/i });
    const taskBtn = screen.getByRole("button", { name: /nueva tarea/i });

    expect(catBtn).toBeInTheDocument();
    expect(taskBtn).toBeInTheDocument();

    fireEvent.click(catBtn);
    expect(onOpenCatMock).toHaveBeenCalledTimes(1);

    fireEvent.click(taskBtn);
    expect(onOpenTaskMock).toHaveBeenCalledTimes(1);
  });

  it("displays error banner when errorMsg is provided", () => {
    render(
      <AdminTareasNav
        activeTab="history"
        errorMsg="Error al cargar registros."
      />,
    );

    expect(screen.getByText("Error al cargar registros.")).toBeInTheDocument();
  });
});

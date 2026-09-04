import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskCategoryModal } from "../TaskCategoryModal";

describe("TaskCategoryModal Component", () => {
  it("does not render modal content when isOpen is false", () => {
    render(<TaskCategoryModal isOpen={false} />);
    expect(screen.queryByText("Crear Nueva Categoría")).not.toBeInTheDocument();
  });

  it("renders form when isOpen is true and handles text input and cancel", () => {
    const onCloseMock = vi.fn();
    const onNameChangeMock = vi.fn();
    const onSubmitMock = vi.fn((e) => e.preventDefault());

    render(
      <TaskCategoryModal
        isOpen={true}
        onClose={onCloseMock}
        newCategoryName="Cocina"
        onCategoryNameChange={onNameChangeMock}
        onSubmit={onSubmitMock}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Crear Nueva Categoría")).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/Ej. Cocina, Barra, Limpieza/i);
    expect(input).toHaveValue("Cocina");

    fireEvent.change(input, { target: { value: "Barra Caliente" } });
    expect(onNameChangeMock).toHaveBeenCalledWith("Barra Caliente");

    const cancelBtn = screen.getByRole("button", { name: /cancelar/i });
    fireEvent.click(cancelBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    const submitBtn = screen.getByRole("button", { name: /crear categoría/i });
    fireEvent.click(submitBtn);
    expect(onSubmitMock).toHaveBeenCalled();
  });

  it("displays loading state and disables submit button when isLoading is true", () => {
    render(
      <TaskCategoryModal
        isOpen={true}
        newCategoryName="Parrilla"
        isLoading={true}
      />,
    );

    const btn = screen.getByRole("button", { name: /guardando\.\.\./i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });
});

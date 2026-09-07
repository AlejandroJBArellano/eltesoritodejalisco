import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShiftModal, type ShiftUserOption } from "../ShiftModal";
import type { EmployeeShift } from "@/components/asistencia/types";

const mockUsers: ShiftUserOption[] = [
  { id: "u-1", name: "Carlos Mesero", role: "WAITER" },
  { id: "u-2", name: "Laura Cocinera", role: "CHEF" },
];

describe("ShiftModal Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ShiftModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        users={mockUsers}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders properly when isOpen is true and applies presets and common areas", async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <ShiftModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        defaultDate="2026-09-07"
        defaultUserId="u-1"
        users={mockUsers}
      />
    );

    expect(screen.getByText("Asignar Nuevo Turno")).toBeInTheDocument();

    // Click Vespertino preset (15:00 - 23:00)
    const vespertinoBtn = screen.getByRole("button", { name: /vespertino/i });
    fireEvent.click(vespertinoBtn);

    // Click area button +Cocina
    const cocinaBtn = screen.getByRole("button", { name: /\+Cocina/i });
    fireEvent.click(cocinaBtn);

    // Enter notes
    const notesInput = screen.getByPlaceholderText(/observaciones particulares/i);
    fireEvent.change(notesInput, { target: { value: "Turno pesado de fin de semana" } });

    // Submit form
    const saveBtn = screen.getByRole("button", { name: /guardar turno/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledWith({
        id: undefined,
        user_id: "u-1",
        date: "2026-09-07",
        start_time: "15:00",
        end_time: "23:00",
        area: "Cocina",
        notes: "Turno pesado de fin de semana",
      });
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("handles user and manual time input changes", async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);

    render(
      <ShiftModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        users={mockUsers}
      />
    );

    // Change collaborator
    const userSelect = screen.getByRole("combobox");
    fireEvent.change(userSelect, { target: { value: "u-2" } });

    // Change date
    const dateInputs = screen.getAllByDisplayValue(new Date().toISOString().split("T")[0]);
    fireEvent.change(dateInputs[0], { target: { value: "2026-09-10" } });

    // Change manual area
    const areaInput = screen.getByPlaceholderText(/ej\. cocina, barra/i);
    fireEvent.change(areaInput, { target: { value: "Parrilla" } });

    // Submit
    const saveBtn = screen.getByRole("button", { name: /guardar turno/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "u-2",
          date: "2026-09-10",
          area: "Parrilla",
        })
      );
    });
  });

  it("renders existing shift data and handles delete", async () => {
    const onDeleteMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const existingShift: EmployeeShift = {
      id: "shift-99",
      tenant_id: "tenant-1",
      user_id: "u-2",
      date: "2026-09-08",
      start_time: "10:00:00",
      end_time: "18:00:00",
      area: "Barra",
      notes: "Encargado de bebidas",
      created_at: null,
      updated_at: null,
    };

    render(
      <ShiftModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={vi.fn()}
        onDelete={onDeleteMock}
        initialShift={existingShift}
        users={mockUsers}
      />
    );

    expect(screen.getByText("Editar Turno")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Encargado de bebidas")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /eliminar/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(onDeleteMock).toHaveBeenCalledWith("shift-99");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("aborts delete if confirm is cancelled", async () => {
    const onDeleteMock = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const existingShift: EmployeeShift = {
      id: "shift-99",
      tenant_id: "tenant-1",
      user_id: "u-2",
      date: "2026-09-08",
      start_time: "10:00:00",
      end_time: "18:00:00",
      area: "Barra",
      notes: null,
      created_at: null,
      updated_at: null,
    };

    render(
      <ShiftModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDeleteMock}
        initialShift={existingShift}
        users={mockUsers}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /eliminar/i });
    fireEvent.click(deleteBtn);

    expect(onDeleteMock).not.toHaveBeenCalled();
  });

  it("handles error thrown by onSave", async () => {
    const onSaveMock = vi.fn().mockRejectedValue(new Error("Error al guardar en base de datos"));

    render(
      <ShiftModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        defaultDate="2026-09-07"
        users={mockUsers}
      />
    );

    const saveBtn = screen.getByRole("button", { name: /guardar turno/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Error al guardar en base de datos")).toBeInTheDocument();
    });
  });

  it("handles error thrown by onDelete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDeleteMock = vi.fn().mockRejectedValue(new Error("Error al eliminar turno"));

    const existingShift: EmployeeShift = {
      id: "shift-99",
      tenant_id: "tenant-1",
      user_id: "u-2",
      date: "2026-09-08",
      start_time: "10:00:00",
      end_time: "18:00:00",
      area: null,
      notes: null,
      created_at: null,
      updated_at: null,
    };

    render(
      <ShiftModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDeleteMock}
        initialShift={existingShift}
        users={mockUsers}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /eliminar/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Error al eliminar turno")).toBeInTheDocument();
    });
  });

  it("handles onClose when cancel button or close X is clicked", () => {
    const onCloseMock = vi.fn();
    render(
      <ShiftModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={vi.fn()}
        users={mockUsers}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /cerrar modal/i });
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalled();
  });
});

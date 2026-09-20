import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoleEditorModal } from "../RoleEditorModal";
import * as roleActions from "@/app/admin/users/roles-actions";

vi.mock("@/app/admin/users/roles-actions", () => ({
  createCustomRole: vi.fn(),
  updateCustomRole: vi.fn(),
  duplicateRole: vi.fn(),
}));

describe("RoleEditorModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no se renderiza cuando isOpen es false", () => {
    render(
      <RoleEditorModal
        isOpen={false}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza correctamente para crear un nuevo rol", () => {
    render(
      <RoleEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Crear Nuevo Rol Personalizado")).toBeDefined();
    expect(screen.getByLabelText(/Nombre del Rol/i)).toBeDefined();
    expect(screen.getByText("Guardar Rol")).toBeDefined();
  });

  it("permite seleccionar y deseleccionar permisos individuales y de módulo", () => {
    render(
      <RoleEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />,
    );

    // Botón todos
    const btnTodos = screen.getByText("Todos");
    fireEvent.click(btnTodos);

    // Deseleccionar
    const btnNinguno = screen.getByText("Ninguno");
    fireEvent.click(btnNinguno);

    // Toggle de un módulo específico (Ventas)
    const selectAllPos = screen.getAllByText("Seleccionar todo")[0];
    fireEvent.click(selectAllPos);
  });

  it("envía la creación del rol personalizado al presionar Guardar", async () => {
    vi.mocked(roleActions.createCustomRole).mockResolvedValue({
      success: true,
      role: { id: "1", name: "Capitán", permissions: ["pos.view"], is_system: false, tenant_id: "t-1" },
    });

    render(
      <RoleEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />,
    );

    const nameInput = screen.getByLabelText(/Nombre del Rol/i);
    fireEvent.change(nameInput, { target: { value: "Capitán de Meseros" } });

    const submitBtn = screen.getByText("Guardar Rol");
    fireEvent.click(submitBtn);

    expect(roleActions.createCustomRole).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Capitán de Meseros",
      }),
    );
  });

  it("muestra error si se intenta guardar sin nombre", () => {
    render(
      <RoleEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />,
    );

    const nameInput = screen.getByLabelText(/Nombre del Rol/i);
    fireEvent.change(nameInput, { target: { value: "" } });

    const form = screen.getByRole("dialog").querySelector("form");
    if (form) {
      fireEvent.submit(form);
    }

    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("muestra modo solo lectura para roles del sistema", () => {
    const systemRole = {
      id: "sys-admin",
      name: "Administrador",
      tenant_id: "t-1",
      is_system: true,
      permissions: ["*"],
    };

    render(
      <RoleEditorModal
        isOpen={true}
        roleToEdit={systemRole}
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />,
    );

    expect(screen.getByText("Editar Rol: Administrador")).toBeDefined();
    expect(screen.getByLabelText(/Nombre del Rol/i)).toBeDisabled();
    expect(
      screen.getByText("Duplicar como Rol Personalizado"),
    ).toBeDefined();
  });
});

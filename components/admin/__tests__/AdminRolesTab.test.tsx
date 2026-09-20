import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminRolesTab } from "../AdminRolesTab";
import * as roleActions from "@/app/admin/users/roles-actions";

vi.mock("@/app/admin/users/roles-actions", () => ({
  getTenantRoles: vi.fn(),
  deleteCustomRole: vi.fn(),
  createCustomRole: vi.fn(),
  updateCustomRole: vi.fn(),
  duplicateRole: vi.fn(),
}));

describe("AdminRolesTab", () => {
  const mockRoles = [
    {
      id: "role-1",
      name: "Administrador",
      description: "Acceso total",
      is_system: true,
      system_slug: "ADMIN",
      permissions: ["*"],
      tenant_id: "t-1",
      user_count: 2,
    },
    {
      id: "role-2",
      name: "Capitán de Meseros",
      description: "Supervisión",
      is_system: false,
      permissions: ["pos.view", "pos.apply_discount"],
      tenant_id: "t-1",
      user_count: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(roleActions.getTenantRoles).mockResolvedValue({
      data: mockRoles,
    });
  });

  it("renderiza la lista de roles del sistema y personalizados", async () => {
    render(<AdminRolesTab />);

    await waitFor(() => {
      expect(screen.getByText("Roles y Permisos Operativos")).toBeDefined();
      expect(screen.getByText("Administrador")).toBeDefined();
      expect(screen.getByText("Capitán de Meseros")).toBeDefined();
      expect(screen.getByText("Sistema")).toBeDefined();
      expect(screen.getByText("Personalizado")).toBeDefined();
    });
  });

  it("permite abrir el modal de nuevo rol al hacer click en 'Nuevo Rol'", async () => {
    render(<AdminRolesTab />);

    await waitFor(() => {
      expect(screen.getByText("Nuevo Rol")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Nuevo Rol"));
    expect(screen.getByText("Crear Nuevo Rol Personalizado")).toBeDefined();
  });

  it("filtra roles mediante el buscador", async () => {
    render(<AdminRolesTab />);

    await waitFor(() => {
      expect(screen.getByText("Administrador")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(
      /Buscar rol por nombre o descripción/i,
    );
    fireEvent.change(searchInput, { target: { value: "Capitán" } });

    expect(screen.getByText("Capitán de Meseros")).toBeDefined();
    expect(screen.queryByText("Administrador")).toBeNull();
  });

  it("muestra modal de confirmación y reasignación al intentar borrar un rol personalizado con usuarios", async () => {
    render(<AdminRolesTab />);

    await waitFor(() => {
      expect(screen.getByText("Capitán de Meseros")).toBeDefined();
    });

    const deleteBtn = screen.getByTitle("Eliminar rol");
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Eliminar Rol: Capitán de Meseros/i)).toBeDefined();
    expect(screen.getByText(/Hay 1 colaborador\(es\) con este rol/i)).toBeDefined();

    vi.mocked(roleActions.deleteCustomRole).mockResolvedValue({ success: true });

    const confirmBtn = screen.getByText("Confirmar Eliminación");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(roleActions.deleteCustomRole).toHaveBeenCalledWith("role-2", "role-1");
    });
  });
});

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperationSection } from "../OperationSection";
import { UserProvider, type UserProfile } from "@/components/UserProvider";

const mockAdminProfile: UserProfile = {
  id: "u-1",
  email: "admin@test.com",
  full_name: "Admin User",
  role: "ADMIN",
  role_id: null,
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: "1234",
};

describe("OperationSection Component", () => {
  it("renders all operation cards when isAdmin is true via props", () => {
    render(<OperationSection isAdmin={true} isWaiter={false} />);

    expect(screen.getByText("Operación Diaria")).toBeInTheDocument();
    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();
    expect(screen.getByText("Monitor de Cocina")).toBeInTheDocument();
    expect(screen.getByText("Tareas y Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Registrar Gasto")).toBeInTheDocument();
  });

  it("renders all operation cards with 0-props when wrapped in UserProvider", () => {
    render(
      <UserProvider initialProfile={mockAdminProfile}>
        <OperationSection />
      </UserProvider>,
    );

    expect(screen.getByText("Operación Diaria")).toBeInTheDocument();
    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();
    expect(screen.getByText("Tareas y Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Registrar Gasto")).toBeInTheDocument();
  });

  it("renders all operation cards when isWaiter is true", () => {
    render(<OperationSection isAdmin={false} isWaiter={true} />);

    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();
    expect(screen.getByText("Tareas y Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Monitor de Cocina")).toBeInTheDocument();
    expect(screen.getByText("Registrar Gasto")).toBeInTheDocument();
  });

  it("hides POS, Tareas and Gasto when user is not admin, waiter nor inventory", () => {
    render(
      <OperationSection isAdmin={false} isWaiter={false} isInventory={false} />,
    );

    expect(screen.queryByText("Punto de Venta")).not.toBeInTheDocument();
    expect(screen.queryByText("Tareas y Asistencia")).not.toBeInTheDocument();
    expect(screen.queryByText("Registrar Gasto")).not.toBeInTheDocument();
    expect(screen.getByText("Monitor de Cocina")).toBeInTheDocument();
  });

  it("shows Tareas y Asistencia but hides POS and Gasto when isInventory is true", () => {
    render(
      <OperationSection isAdmin={false} isWaiter={false} isInventory={true} />,
    );

    expect(screen.queryByText("Punto de Venta")).not.toBeInTheDocument();
    expect(screen.queryByText("Registrar Gasto")).not.toBeInTheDocument();
    expect(screen.getByText("Tareas y Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Monitor de Cocina")).toBeInTheDocument();
  });
});

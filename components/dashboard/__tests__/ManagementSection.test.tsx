import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ManagementSection } from "../ManagementSection";
import { UserProvider, type UserProfile } from "@/components/UserProvider";
import { TenantProvider } from "@/components/TenantProvider";
import type { TenantContextType } from "@/lib/tenant";

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

const mockTenant: TenantContextType = {
  id: "t-1",
  name: "Mi Restaurante",
  slug: "mi-restaurante",
  system_name: "Kittn",
  stripe_charges_enabled: true,
} as TenantContextType;

describe("ManagementSection Component", () => {
  it("renders null when user is neither admin nor waiter", () => {
    const { container } = render(
      <ManagementSection
        isAdmin={false}
        isWaiter={false}
        tenant={{ slug: "tacos", stripe_charges_enabled: false }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders waiter accessible modules with Stripe disabled link", () => {
    render(
      <ManagementSection
        isAdmin={false}
        isWaiter={true}
        tenant={{ slug: "tacos", stripe_charges_enabled: false }}
      />,
    );

    expect(screen.getByText("Gestión y Clientes")).toBeInTheDocument();
    expect(screen.getByText("Kittn Pickup & Horarios")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();

    const pickupLink = screen.getByRole("link", { name: /kittn pickup/i });
    expect(pickupLink).toHaveAttribute("href", "/admin/pickup");

    // Admin-only modules should be hidden
    expect(screen.queryByText("Gestión de Menú")).not.toBeInTheDocument();
    expect(screen.queryByText("Inventario")).not.toBeInTheDocument();
    expect(screen.queryByText("Colaboradores y Roles")).not.toBeInTheDocument();
  });

  it("renders full admin modules with Pickup hub link", () => {
    render(
      <ManagementSection
        isAdmin={true}
        isWaiter={false}
        tenant={{ slug: "tacos-al-pastor", stripe_charges_enabled: true }}
      />,
    );

    expect(screen.getByText("Gestión y Clientes")).toBeInTheDocument();
    expect(screen.getByText("Kittn Pickup & Horarios")).toBeInTheDocument();

    const pickupLink = screen.getByRole("link", { name: /kittn pickup/i });
    expect(pickupLink).toHaveAttribute("href", "/admin/pickup");

    // Check all admin cards
    expect(screen.getByText("Gestión de Menú")).toBeInTheDocument();
    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.getByText("Colaboradores y Roles")).toBeInTheDocument();
    expect(screen.getByText("Horarios y Turnos")).toBeInTheDocument();
    expect(screen.getByText("Control de Tareas")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
  });

  it("renders autonomously with 0 props when inside UserProvider and TenantProvider", () => {
    render(
      <TenantProvider tenant={mockTenant}>
        <UserProvider initialProfile={mockAdminProfile}>
          <ManagementSection />
        </UserProvider>
      </TenantProvider>,
    );

    expect(screen.getByText("Gestión y Clientes")).toBeInTheDocument();
    expect(screen.getByText("Kittn Pickup & Horarios")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
  });

  it("renders Inventario module card when isInventory is true", () => {
    render(
      <ManagementSection
        isAdmin={false}
        isWaiter={false}
        isInventory={true}
        tenant={{ slug: "almacen-tacos", stripe_charges_enabled: false }}
      />,
    );

    expect(screen.getByText("Gestión y Clientes")).toBeInTheDocument();
    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(
      screen.queryByText("Kittn Pickup & Horarios"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Clientes")).not.toBeInTheDocument();
    expect(screen.queryByText("Gestión de Menú")).not.toBeInTheDocument();
    expect(screen.queryByText("Colaboradores y Roles")).not.toBeInTheDocument();
  });
});

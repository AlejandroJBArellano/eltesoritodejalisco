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
    expect(screen.getByText("Kittn Pickup")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();

    const pickupLink = screen.getByRole("link", { name: /kittn pickup/i });
    expect(pickupLink).toHaveAttribute("href", "/admin/settings#pickup");
    expect(screen.getByText("Inactivo")).toBeInTheDocument();

    // Admin-only modules should be hidden
    expect(screen.queryByText("Gestión de Menú")).not.toBeInTheDocument();
    expect(screen.queryByText("Inventario")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });

  it("renders full admin modules with Stripe enabled external link", () => {
    render(
      <ManagementSection
        isAdmin={true}
        isWaiter={false}
        tenant={{ slug: "tacos-al-pastor", stripe_charges_enabled: true }}
      />,
    );

    expect(screen.getByText("Gestión y Clientes")).toBeInTheDocument();
    expect(screen.getByText("Kittn Pickup")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();

    const pickupLink = screen.getByRole("link", { name: /kittn pickup/i });
    expect(pickupLink).toHaveAttribute(
      "href",
      "https://tacos-al-pastor.trykittn.com",
    );
    expect(pickupLink).toHaveAttribute("target", "_blank");

    // Check all admin cards
    expect(screen.getByText("Gestión de Menú")).toBeInTheDocument();
    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.getByText("Historial de Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Control de Tareas")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Horarios del Portal")).toBeInTheDocument();
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
    expect(screen.getByText("Kittn Pickup")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
  });
});

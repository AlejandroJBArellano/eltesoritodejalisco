import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinanceSection } from "../FinanceSection";
import { UserProvider, type UserProfile } from "@/components/UserProvider";

const mockAdminProfile: UserProfile = {
  id: "u-1",
  email: "admin@test.com",
  full_name: "Admin User",
  role: "ADMIN",
  tenant_id: "t-1",
  updated_at: "2026-01-01",
};

describe("FinanceSection Component", () => {
  it("renders null when isAdmin is false", () => {
    const { container } = render(<FinanceSection isAdmin={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders financial modules when isAdmin is true", () => {
    render(<FinanceSection isAdmin={true} />);

    expect(screen.getByText("Finanzas y Reportes")).toBeInTheDocument();
    expect(screen.getByText("Historial")).toBeInTheDocument();
    expect(screen.getByText("Gastos")).toBeInTheDocument();
    expect(screen.getByText("Reportes")).toBeInTheDocument();
    expect(screen.getByText("Horas Pico")).toBeInTheDocument();
  });

  it("renders financial modules with 0 props when inside UserProvider with admin role", () => {
    render(
      <UserProvider initialProfile={mockAdminProfile}>
        <FinanceSection />
      </UserProvider>,
    );

    expect(screen.getByText("Finanzas y Reportes")).toBeInTheDocument();
    expect(screen.getByText("Historial")).toBeInTheDocument();
  });
});

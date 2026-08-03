import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "../PageHeader";

describe("PageHeader Component", () => {
  it("should render title and subtitle correctly", () => {
    render(
      <PageHeader
        title="Administración de Usuarios"
        subtitle="Gestiona roles y permisos"
      />,
    );

    expect(screen.getByText("Administración de Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Gestiona roles y permisos")).toBeInTheDocument();
  });

  it("should render back navigation link by default", () => {
    render(
      <PageHeader
        title="Punto de Venta"
        backHref="/dashboard"
        backLabel="Volver al Dashboard"
      />,
    );

    const link = screen.getByRole("link", { name: /Volver al Dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("should hide back navigation when showBack is false", () => {
    render(<PageHeader title="Dashboard" showBack={false} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should render action buttons when passed", () => {
    render(
      <PageHeader
        title="Clientes"
        actions={<button data-testid="new-client-btn">Nuevo Cliente</button>}
      />,
    );

    expect(screen.getByTestId("new-client-btn")).toBeInTheDocument();
    expect(screen.getByText("Nuevo Cliente")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SalesSourceCard } from "../SalesSourceCard";

describe("SalesSourceCard Component", () => {
  it("renders sales sources with counts and totals", () => {
    const mockSources = {
      "Mostrador POS": { count: 85, total: 9500.5 },
      "Rappi Delivery": { count: 15, total: 1800 },
    };

    render(<SalesSourceCard salesBySource={mockSources} />);

    expect(screen.getByText("Ventas por Canal / Fuente")).toBeInTheDocument();
    expect(screen.getByText("Mostrador POS")).toBeInTheDocument();
    expect(screen.getByText("85 órdenes procesadas")).toBeInTheDocument();
    expect(screen.getByText("$9,500.50")).toBeInTheDocument();

    expect(screen.getByText("Rappi Delivery")).toBeInTheDocument();
    expect(screen.getByText("15 órdenes procesadas")).toBeInTheDocument();
    expect(screen.getByText("$1,800.00")).toBeInTheDocument();
  });

  it("renders empty state when no sources are provided", () => {
    render(<SalesSourceCard salesBySource={{}} />);
    expect(screen.getByText("No hay fuentes registradas.")).toBeInTheDocument();
  });
});

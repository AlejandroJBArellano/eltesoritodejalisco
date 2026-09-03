import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopCustomersTable } from "../TopCustomersTable";

describe("TopCustomersTable Component", () => {
  it("renders top customers with spend and points", () => {
    const mockCustomers = [
      { name: "Mariana Silva", totalSpend: 2450.75, loyaltyPoints: 340 },
      { name: "Carlos Ramos", totalSpend: 1100, loyaltyPoints: 150 },
    ];

    render(<TopCustomersTable topCustomers={mockCustomers} period="30days" />);

    expect(screen.getByText("Mejores Clientes")).toBeInTheDocument();
    expect(screen.getByText("Mariana Silva")).toBeInTheDocument();
    expect(screen.getByText("MA")).toBeInTheDocument();
    expect(screen.getByText("$2450.75")).toBeInTheDocument();
    expect(screen.getByText("340 pts")).toBeInTheDocument();

    expect(screen.getByText("Carlos Ramos")).toBeInTheDocument();
    expect(screen.getByText("CA")).toBeInTheDocument();
    expect(screen.getByText("$1100.00")).toBeInTheDocument();
  });

  it("renders empty state when no customers exist", () => {
    render(<TopCustomersTable topCustomers={[]} period="today" />);
    expect(
      screen.getByText("No hay clientes registrados en este período."),
    ).toBeInTheDocument();
  });
});

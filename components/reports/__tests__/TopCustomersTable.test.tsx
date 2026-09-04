import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopCustomersTable } from "../TopCustomersTable";

vi.mock("@/lib/export", () => ({
  exportToCSV: vi.fn(),
  exportToExcel: vi.fn(),
}));

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

  it("renders empty state when no customers exist and triggers export", () => {
    render(<TopCustomersTable topCustomers={[]} period="today" />);
    expect(
      screen.getByText("No hay clientes registrados en este período."),
    ).toBeInTheDocument();

    const exportBtn = screen.getByRole("button", { name: /Exportar/i });
    fireEvent.click(exportBtn);
    const csvBtn = screen.getByText(/CSV \(\.csv\)/i);
    fireEvent.click(csvBtn);
  });

  it("renders with default props when no props are provided", () => {
    render(<TopCustomersTable />);
    expect(screen.getByText("Mejores Clientes")).toBeInTheDocument();
  });
});

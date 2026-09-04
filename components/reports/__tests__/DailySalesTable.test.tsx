import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DailySalesTable } from "../DailySalesTable";

vi.mock("@/lib/export", () => ({
  exportToCSV: vi.fn(),
  exportToExcel: vi.fn(),
}));

describe("DailySalesTable Component", () => {
  it("renders daily sales rows and header details", () => {
    const mockData = [
      {
        date: "2026-09-01",
        dayOfWeek: "Martes",
        totalSales: 4500,
        totalOrders: 30,
        averageTicket: 150,
        topProduct: "Latte",
        percentageOfPeriod: 60,
      },
      {
        date: "2026-09-02",
        dayOfWeek: "Miércoles",
        totalSales: 3000,
        totalOrders: 20,
        averageTicket: 150,
        topProduct: "Mocha",
        percentageOfPeriod: 40,
      },
    ];

    render(<DailySalesTable dailySalesData={mockData} period="7days" />);

    expect(screen.getByText("Detalle de Ventas Diarias")).toBeInTheDocument();
    expect(screen.getByText("2026-09-01")).toBeInTheDocument();
    expect(screen.getByText("Martes")).toBeInTheDocument();
    expect(screen.getByText("$4500.00")).toBeInTheDocument();
    expect(screen.getByText("Latte")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();

    expect(screen.getByText("2026-09-02")).toBeInTheDocument();
    expect(screen.getByText("Miércoles")).toBeInTheDocument();
  });

  it("renders empty state when no data provided and triggers export filename", () => {
    render(<DailySalesTable dailySalesData={[]} period="today" />);
    expect(
      screen.getByText("No hay ventas registradas en el período."),
    ).toBeInTheDocument();

    const exportBtn = screen.getByRole("button", { name: /Exportar/i });
    fireEvent.click(exportBtn);
    const csvBtn = screen.getByText(/CSV \(\.csv\)/i);
    fireEvent.click(csvBtn);
  });

  it("renders with default props when no props are passed", () => {
    render(<DailySalesTable />);
    expect(screen.getByText("Detalle de Ventas Diarias")).toBeInTheDocument();
    expect(
      screen.getByText("No hay ventas registradas en el período."),
    ).toBeInTheDocument();
  });
});

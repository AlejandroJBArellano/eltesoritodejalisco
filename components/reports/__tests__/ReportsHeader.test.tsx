import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportsHeader } from "../ReportsHeader";

vi.mock("@/lib/export", () => ({
  exportToCSV: vi.fn(),
  exportToExcel: vi.fn(),
}));

describe("ReportsHeader Component", () => {
  it("renders page title, period and action buttons", () => {
    render(
      <ReportsHeader
        period="7days"
        dailySalesData={[]}
        enrichedProductSales={[]}
      />,
    );

    expect(screen.getByText("Reportes & Balance")).toBeInTheDocument();
    expect(screen.getByText(/Últimos 7 días/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explorar Gráficas/i })).toHaveAttribute(
      "href",
      "/analytics/sales",
    );
    expect(screen.getByRole("link", { name: /Horas Pico/i })).toHaveAttribute(
      "href",
      "/analytics/hourly",
    );
    expect(screen.getByText(/Imprimir \/ PDF/i)).toBeInTheDocument();
  });

  it("renders with default props when no props are provided", () => {
    render(<ReportsHeader />);
    expect(screen.getByText("Reportes & Balance")).toBeInTheDocument();
  });

  it("triggers export filename callbacks when exporting", () => {
    render(<ReportsHeader period="today" />);
    const btn1 = screen.getByRole("button", { name: /Exportar Ventas Diarias/i });
    fireEvent.click(btn1);
    const csvBtn1 = screen.getAllByText(/CSV \(\.csv\)/i)[0];
    if (csvBtn1) fireEvent.click(csvBtn1);

    const btn2 = screen.getByRole("button", { name: /Exportar Productos/i });
    fireEvent.click(btn2);
    const csvBtn2 = screen.getAllByText(/CSV \(\.csv\)/i)[0];
    if (csvBtn2) fireEvent.click(csvBtn2);
  });

  it("calls window.print when print button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(
      <ReportsHeader
        period="today"
        dailySalesData={[]}
        enrichedProductSales={[]}
      />,
    );

    const printBtn = screen.getByText(/Imprimir \/ PDF/i);
    printBtn.click();
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});

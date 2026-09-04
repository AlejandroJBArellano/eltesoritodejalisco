import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HistoryCharts } from "../HistoryCharts";
import { OrderStatus, type OrderWithDetails } from "@/types";

const mockOrders: OrderWithDetails[] = [
  {
    id: "ord-1",
    orderNumber: "101",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Mesa 1",
    notes: "",
    subtotal: 100,
    tax: 16,
    total: 116,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [
      {
        id: "item-1",
        orderId: "ord-1",
        menuItemId: "m-1",
        quantity: 2,
        unitPrice: 50,
        createdAt: new Date(),
        menuItem: {
          id: "m-1",
          name: "Pozole",
          category: "Caldos",
          price: 50,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    payments: [],
  },
];

describe("HistoryCharts Component", () => {
  it("renders charts container and titles", () => {
    render(<HistoryCharts orders={mockOrders} />);

    expect(screen.getByText("Análisis y Tendencias")).toBeDefined();
    expect(screen.getByText("Mix de Categorías")).toBeDefined();
  });

  it("renders empty fallback when no sales data for pie chart", () => {
    render(<HistoryCharts orders={[]} />);

    expect(screen.getByText("Sin ventas suficientes este mes")).toBeDefined();
    expect(screen.getByText("Sin ventas registradas este mes")).toBeDefined();
  });

  it("handles hover on line point and donut slice", () => {
    render(<HistoryCharts orders={mockOrders} />);

    // Donut slice hover
    const caldosLegend = screen.getByText("Caldos");
    expect(caldosLegend).toBeInTheDocument();

    const paths = document.querySelectorAll("path");
    paths.forEach((p) => {
      fireEvent.mouseEnter(p);
      fireEvent.mouseLeave(p);
    });
  });
});

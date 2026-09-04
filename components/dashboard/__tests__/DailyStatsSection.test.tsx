import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyStatsSection } from "../DailyStatsSection";
import type { DashboardStats } from "../types";

const mockStats: DashboardStats = {
  activeOrdersCount: 5,
  salesToday: 4250.5,
  customersCount: 38,
  tipsToday: 520,
};

describe("DailyStatsSection Component", () => {
  it("renders daily summary collapsible section with 4 stat cards", () => {
    render(<DailyStatsSection stats={mockStats} />);

    expect(screen.getByText("Resumen del Día")).toBeInTheDocument();
    expect(screen.getByText("Órdenes Activas")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Venta Bruta")).toBeInTheDocument();
    expect(screen.getByText("$4,250.50")).toBeInTheDocument();

    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();

    expect(screen.getByText("Propinas Hoy")).toBeInTheDocument();
    expect(screen.getByText("$520.00")).toBeInTheDocument();
  });
});

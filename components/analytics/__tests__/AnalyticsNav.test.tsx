import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsNav } from "../AnalyticsNav";

describe("AnalyticsNav Component", () => {
  it("renders navigation links and highlights active sales tab", () => {
    render(<AnalyticsNav activeTab="sales" />);

    expect(screen.getByRole("link", { name: /Volver a Reportes/i })).toHaveAttribute(
      "href",
      "/reports",
    );

    const salesLink = screen.getByRole("link", { name: /Ventas & Productos/i });
    expect(salesLink).toHaveAttribute("href", "/analytics/sales");
    expect(salesLink.className).toContain("bg-purple-600");

    const hourlyLink = screen.getByRole("link", { name: /Horas Pico & Calor/i });
    expect(hourlyLink).toHaveAttribute("href", "/analytics/hourly");
  });

  it("highlights active hourly tab", () => {
    render(<AnalyticsNav activeTab="hourly" />);

    const hourlyLink = screen.getByRole("link", { name: /Horas Pico & Calor/i });
    expect(hourlyLink.className).toContain("bg-amber-500");
  });
});

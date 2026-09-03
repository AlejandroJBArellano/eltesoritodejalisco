import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HourlyAnalyticsView } from "../HourlyAnalyticsView";
import type { HourlyApiResponse } from "../HourlyAnalyticsView";

describe("HourlyAnalyticsView Component", () => {
  const mockResponse: HourlyApiResponse = {
    period: "today",
    rows: [
      {
        hour: 13,
        hourLabel: "13:00",
        displayHour: "13:00",
        sales: 500,
        orders: 5,
        rawSales: 500,
        rawOrders: 5,
        averageTicket: 100,
        percentageOfSales: 100,
        percentageOfOrders: 100,
        isPeakSales: true,
        isPeakOrders: true,
        isHighActivity: true,
      },
    ],
    allRows: [
      {
        hour: 13,
        hourLabel: "13:00",
        displayHour: "13:00",
        sales: 500,
        orders: 5,
        rawSales: 500,
        rawOrders: 5,
        averageTicket: 100,
        percentageOfSales: 100,
        percentageOfOrders: 100,
        isPeakSales: true,
        isPeakOrders: true,
        isHighActivity: true,
      },
    ],
    heatmapCells: [
      {
        dayIndex: 3,
        dayName: "Jueves",
        dayShort: "Jue",
        hour: 13,
        hourLabel: "13:00",
        sales: 500,
        orders: 5,
        intensity: 1,
      },
    ],
    peakHoursSummary: {
      peakSalesHour: {
        hour: 13,
        label: "13:00",
        amount: 500,
        percentage: 100,
      },
      peakOrdersHour: {
        hour: 13,
        label: "13:00",
        count: 5,
        percentage: 100,
      },
      peakTicketHour: {
        hour: 13,
        label: "13:00",
        averageTicket: 100,
        ordersCount: 5,
      },
      rushWindow: {
        startHour: 13,
        endHour: 16,
        label: "13:00 - 16:00",
        sales: 500,
        percentage: 100,
        orders: 5,
      },
      activeHoursCount: 1,
      totalPeriodSales: 500,
      totalPeriodOrders: 5,
      daysInPeriod: 1,
    },
    divisor: 1,
    mode: "sum",
  };

  beforeEach(() => {
    vi.spyOn(global, "fetch").mockImplementation(
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should display loading state initially and then render peak cards, charts, and table", async () => {
    render(<HourlyAnalyticsView />);

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("peak-hours-cards")).toBeInTheDocument();
    expect(screen.getByTestId("hourly-bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("hourly-breakdown-table")).toBeInTheDocument();
  });

  it("should display error message when fetch fails", async () => {
    vi.spyOn(global, "fetch").mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Fallo en base de datos" }),
      } as Response),
    );

    render(<HourlyAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Fallo en base de datos")).toBeInTheDocument();
    });
  });

  it("should switch tabs between bar chart and heatmap", async () => {
    const user = userEvent.setup();
    render(<HourlyAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByTestId("hourly-bar-chart")).toBeInTheDocument();
    });

    const heatmapTabBtn = screen.getByTestId("tab-btn-heatmap");
    await user.click(heatmapTabBtn);

    expect(screen.getByTestId("hourly-heatmap")).toBeInTheDocument();

    const barTabBtn = screen.getByTestId("tab-btn-bar");
    await user.click(barTabBtn);

    expect(screen.getByTestId("hourly-bar-chart")).toBeInTheDocument();
  });

  it("should switch periods and trigger fetch with selected period", async () => {
    const user = userEvent.setup();
    render(<HourlyAnalyticsView />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const yesterdayBtn = screen.getByTestId("period-btn-yesterday");
    await user.click(yesterdayBtn);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("period=yesterday"),
    );
  });

  it("should show multi-day mode toggles when 7days period is selected and switch mode", async () => {
    const user = userEvent.setup();
    render(<HourlyAnalyticsView />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const sevenDaysBtn = screen.getByTestId("period-btn-7days");
    await user.click(sevenDaysBtn);

    const avgModeBtn = await screen.findByTestId("mode-btn-average");
    expect(avgModeBtn).toBeInTheDocument();

    await user.click(avgModeBtn);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("mode=average"),
    );
  });

  it("should toggle only active hours filter", async () => {
    const user = userEvent.setup();
    render(<HourlyAnalyticsView />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const activeToggle = screen.getByTestId("toggle-active-hours");
    expect(screen.getByText("24 Horas Completas")).toBeInTheDocument();

    await user.click(activeToggle);
    expect(screen.getByText("Solo Horas Activas")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("onlyActiveHours=true"),
    );
  });

  it("should handle custom date range inputs and apply", async () => {
    const user = userEvent.setup();
    render(<HourlyAnalyticsView />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const customBtn = screen.getByTestId("period-btn-custom");
    await user.click(customBtn);

    const applyBtn = screen.getByRole("button", { name: /Aplicar Rango/i });
    // Click without setting dates should not fetch
    await user.click(applyBtn);

    const startInput = screen.getByLabelText(/Desde:/i);
    const endInput = screen.getByLabelText(/Hasta:/i);

    await user.type(startInput, "2026-09-01");
    await user.type(endInput, "2026-09-03");
    await user.click(applyBtn);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("startDate=2026-09-01&endDate=2026-09-03"),
    );
  });

  it("should refetch when refresh button is clicked", async () => {
    const user = userEvent.setup();
    render(<HourlyAnalyticsView />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const refreshBtn = screen.getByTestId("refresh-btn");
    await user.click(refreshBtn);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

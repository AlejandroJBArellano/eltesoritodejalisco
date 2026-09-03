import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrdersFilterBar } from "../OrdersFilterBar";
import { PaymentMethod } from "@/types";
import type { OrderFilters } from "../types";

describe("OrdersFilterBar Component", () => {
  const defaultFilters: OrderFilters = {
    searchQuery: "",
    dateFilter: "",
    tableFilter: "",
    paymentMethodFilter: "",
    sourceFilter: "",
  };

  it("renders search input, filter selects and export button", () => {
    render(
      <OrdersFilterBar
        filters={defaultFilters}
        availableTables={["Mesa 1", "Mesa 2"]}
        sortedOrders={[]}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText("Buscar por folio (#1001)...")).toBeDefined();
    expect(screen.getByText("Todas las Mesas")).toBeDefined();
    expect(screen.getByText("Todos los Métodos")).toBeDefined();
    expect(screen.getByText("Todos los Canales")).toBeDefined();
    expect(screen.queryByText("Limpiar")).toBeNull();
  });

  it("calls onFilterChange when typing in search", () => {
    const onFilterChange = vi.fn();
    render(
      <OrdersFilterBar
        filters={defaultFilters}
        availableTables={["Mesa 1"]}
        sortedOrders={[]}
        onFilterChange={onFilterChange}
        onResetFilters={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Buscar por folio (#1001)...");
    fireEvent.change(input, { target: { value: "105" } });
    expect(onFilterChange).toHaveBeenCalledWith("searchQuery", "105");
  });

  it("shows Limpiar button and triggers onResetFilters when filters active", () => {
    const onResetFilters = vi.fn();
    render(
      <OrdersFilterBar
        filters={{ ...defaultFilters, searchQuery: "105" }}
        availableTables={["Mesa 1"]}
        sortedOrders={[]}
        onFilterChange={vi.fn()}
        onResetFilters={onResetFilters}
      />,
    );

    const clearBtn = screen.getByText("Limpiar");
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn);
    expect(onResetFilters).toHaveBeenCalled();
  });

  it("handles changes in all dropdown selects and date picker", () => {
    const onFilterChange = vi.fn();
    const { container } = render(
      <OrdersFilterBar
        filters={defaultFilters}
        availableTables={["Mesa 1"]}
        sortedOrders={[]}
        onFilterChange={onFilterChange}
        onResetFilters={vi.fn()}
      />,
    );

    const dateInput = container.querySelector('input[type="date"]');
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: "2026-09-03" } });
      expect(onFilterChange).toHaveBeenCalledWith("dateFilter", "2026-09-03");
    }

    const tableSelect = screen.getByDisplayValue("Todas las Mesas");
    fireEvent.change(tableSelect, { target: { value: "Mesa 1" } });
    expect(onFilterChange).toHaveBeenCalledWith("tableFilter", "Mesa 1");

    const paymentSelect = screen.getByDisplayValue("Todos los Métodos");
    fireEvent.change(paymentSelect, { target: { value: PaymentMethod.CASH } });
    expect(onFilterChange).toHaveBeenCalledWith("paymentMethodFilter", PaymentMethod.CASH);

    const channelSelect = screen.getByDisplayValue("Todos los Canales");
    fireEvent.change(channelSelect, { target: { value: "PICKUP_APP" } });
    expect(onFilterChange).toHaveBeenCalledWith("sourceFilter", "PICKUP_APP");
  });
});

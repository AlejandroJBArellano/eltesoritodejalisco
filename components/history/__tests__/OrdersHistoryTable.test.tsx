import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrdersHistoryTable } from "../OrdersHistoryTable";
import { OrderStatus, PaymentMethod, type OrderWithDetails } from "@/types";

const mockOrders: OrderWithDetails[] = [
  {
    id: "ord-1",
    orderNumber: "1001",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Mesa 1",
    notes: "",
    subtotal: 100,
    tax: 16,
    total: 116,
    createdAt: new Date("2026-09-01T12:00:00Z"),
    updatedAt: new Date(),
    orderItems: [
      {
        id: "i-1",
        orderId: "ord-1",
        menuItemId: "m-1",
        quantity: 1,
        unitPrice: 116,
        createdAt: new Date(),
        menuItem: {
          id: "m-1",
          name: "Pozole",
          price: 116,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    payments: [
      {
        id: "p-1",
        orderId: "ord-1",
        method: PaymentMethod.CASH,
        amount: 116,
        tipAmount: 10,
        createdAt: new Date(),
      },
    ],
  },
  {
    id: "ord-2",
    orderNumber: "1002",
    source: "PICKUP_APP",
    status: OrderStatus.UNCOLLECTED,
    table: undefined,
    notes: "",
    subtotal: 50,
    tax: 8,
    total: 58,
    createdAt: new Date("2026-09-01T13:00:00Z"),
    updatedAt: new Date(),
    orderItems: [],
    payments: [],
  },
];

describe("OrdersHistoryTable Component", () => {
  it("renders order rows and payment labels", () => {
    render(
      <OrdersHistoryTable
        orders={mockOrders}
        sortField="createdAt"
        sortDir="desc"
        page={1}
        pageSize={10}
        totalPages={1}
        totalItems={2}
        expandedRow={null}
        onSort={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onToggleRow={vi.fn()}
        onBillOrder={vi.fn()}
      />,
    );

    expect(screen.getByText("#1001")).toBeDefined();
    expect(screen.getByText("#1002")).toBeDefined();
    expect(screen.getByText("Pickup")).toBeDefined();
    expect(screen.getByText("NO COBRADA")).toBeDefined();
  });

  it("calls onToggleRow when row is clicked", () => {
    const onToggleRow = vi.fn();
    render(
      <OrdersHistoryTable
        orders={mockOrders}
        sortField="createdAt"
        sortDir="desc"
        page={1}
        pageSize={10}
        totalPages={1}
        totalItems={2}
        expandedRow={null}
        onSort={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onToggleRow={onToggleRow}
        onBillOrder={vi.fn()}
      />,
    );

    const row = screen.getByTestId("order-row-ord-1");
    fireEvent.click(row);
    expect(onToggleRow).toHaveBeenCalledWith("ord-1");
  });

  it("renders expanded row content when expandedRow matches order id", () => {
    render(
      <OrdersHistoryTable
        orders={mockOrders}
        sortField="createdAt"
        sortDir="desc"
        page={1}
        pageSize={10}
        totalPages={1}
        totalItems={2}
        expandedRow="ord-1"
        onSort={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onToggleRow={vi.fn()}
        onBillOrder={vi.fn()}
      />,
    );

    expect(screen.getByTestId("order-expanded-ord-1")).toBeDefined();
    expect(screen.getByText("Pozole")).toBeDefined();
  });

  it("renders empty state message when orders list is empty", () => {
    render(
      <OrdersHistoryTable
        orders={[]}
        sortField="createdAt"
        sortDir="desc"
        page={1}
        pageSize={10}
        totalPages={1}
        totalItems={0}
        expandedRow={null}
        onSort={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onToggleRow={vi.fn()}
        onBillOrder={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "No se encontraron órdenes que coincidan con los filtros seleccionados.",
      ),
    ).toBeDefined();
  });
});

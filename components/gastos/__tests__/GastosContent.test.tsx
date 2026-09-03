import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GastosContent } from "../GastosContent";

const mockCategories = [
  {
    id: "cat-1",
    name: "Renta",
    color: "#F59E0B",
    tipo_gasto: "fijo",
    created_at: "2026-01-01",
  },
  {
    id: "cat-2",
    name: "Insumos",
    color: "#10B981",
    tipo_gasto: "variable",
    created_at: "2026-01-01",
  },
];

const mockExpenses = [
  {
    id: "exp-1",
    date: "2026-09-01",
    amount: 1500,
    description: "Pago Renta Septiembre",
    category_id: "cat-1",
    has_invoice: true,
    created_at: "2026-09-01T10:00:00Z",
    expense_categories: {
      name: "Renta",
      color: "#F59E0B",
      tipo_gasto: "fijo",
    },
  },
  {
    id: "exp-2",
    date: "2026-09-02",
    amount: 500,
    description: "Insumos Cafetería",
    category_id: "cat-2",
    has_invoice: false,
    created_at: "2026-09-02T11:00:00Z",
    expense_categories: {
      name: "Insumos",
      color: "#10B981",
      tipo_gasto: "variable",
    },
  },
];

describe("GastosContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // pending forever
    render(<GastosContent />);
    expect(screen.getByText(/Cargando panel de gastos/i)).toBeInTheDocument();
  });

  it("renders error state when fetch fails and allows retry", async () => {
    let shouldFail = true;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (shouldFail) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Error de red" }),
        });
      }
      if (url.includes("/api/gastos/categorias")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ expenses: mockExpenses, totalSales: 8000 }),
      });
    });

    render(<GastosContent />);

    await waitFor(() => {
      expect(screen.getByText("Error al Cargar Gastos")).toBeInTheDocument();
      expect(screen.getByText("Error de red")).toBeInTheDocument();
    });

    shouldFail = false;
    const retryBtn = screen.getByRole("button", { name: /Reintentar/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Control de Gastos & Egresos")).toBeInTheDocument();
    });
  });

  it("renders full dashboard and opens/closes modals on user clicks", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/gastos/categorias")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        });
      }
      if (url.includes("/api/gastos")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ expenses: mockExpenses, totalSales: 10000 }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<GastosContent />);

    // Check main dashboard rendered
    await waitFor(() => {
      expect(screen.getByText("Control de Gastos & Egresos")).toBeInTheDocument();
      expect(screen.getByText("Resumen Financiero")).toBeInTheDocument();
      expect(screen.getByText("Categorías Registradas")).toBeInTheDocument();
      expect(screen.getByText("Historial de Gastos")).toBeInTheDocument();
    });

    // Test opening and closing Expense Modal
    fireEvent.click(screen.getByRole("button", { name: /Registrar Gasto/i }));
    expect(screen.getByRole("heading", { name: "Registrar Gasto" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Cerrar modal de gasto"));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Registrar Gasto" })).not.toBeInTheDocument();
    });

    // Test opening and closing Category Modal (Create mode)
    const newCatBtns = screen.getAllByRole("button", { name: /Nueva Categoría/i });
    fireEvent.click(newCatBtns[0]);
    expect(screen.getByRole("heading", { name: "Crear Categoría de Gasto" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Cerrar modal de categoría"));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Crear Categoría de Gasto" })).not.toBeInTheDocument();
    });

    // Test editing category
    fireEvent.click(screen.getByLabelText("Editar categoría Renta"));
    expect(screen.getByRole("heading", { name: "Editar Categoría" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Cerrar modal de categoría"));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Editar Categoría" })).not.toBeInTheDocument();
    });
  });
});

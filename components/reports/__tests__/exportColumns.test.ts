import { describe, it, expect } from "vitest";
import {
  DAILY_SALES_EXPORT_COLUMNS,
  PRODUCT_SALES_EXPORT_COLUMNS,
  TOP_CUSTOMERS_EXPORT_COLUMNS,
} from "../exportColumns";
import type {
  DailySaleExportItem,
  EnrichedProductSaleItem,
  TopCustomerExport,
} from "../types";

describe("Reports Export Columns", () => {
  describe("DAILY_SALES_EXPORT_COLUMNS", () => {
    const sampleDay: DailySaleExportItem = {
      date: "2026-09-01",
      dayOfWeek: "Martes",
      totalSales: 4850.5,
      totalOrders: 32,
      averageTicket: 151.58,
      topProduct: "Latte Frío (18 u.)",
      percentageOfPeriod: 14.2,
    };

    const getCol = (header: string) => {
      const col = DAILY_SALES_EXPORT_COLUMNS.find((c) => c.header === header);
      if (!col) throw new Error(`Column "${header}" not found in DAILY_SALES_EXPORT_COLUMNS`);
      return col;
    };

    it("should have all 7 essential daily sales columns", () => {
      const headers = DAILY_SALES_EXPORT_COLUMNS.map((c) => c.header);
      expect(headers).toEqual([
        "Fecha",
        "Día de la Semana",
        "Ventas Totales",
        "Órdenes",
        "Ticket Promedio",
        "Producto Estrella",
        "% del Total",
      ]);
    });

    it("should format Ventas Totales as currency", () => {
      const col = getCol("Ventas Totales");
      expect(col.accessor!(sampleDay)).toBe("$4850.50");
    });

    it("should format Ticket Promedio as currency", () => {
      const col = getCol("Ticket Promedio");
      expect(col.accessor!(sampleDay)).toBe("$151.58");
    });

    it("should format % del Total with percent symbol", () => {
      const col = getCol("% del Total");
      expect(col.accessor!(sampleDay)).toBe("14.2%");
    });
  });

  describe("PRODUCT_SALES_EXPORT_COLUMNS", () => {
    const sampleProduct: EnrichedProductSaleItem = {
      id: "prod-1",
      name: "Latte Frío 16oz",
      category: "Bebidas",
      quantity: 85,
      revenue: 5525.0,
      rank: 1,
      averageUnitPrice: 65.0,
      percentageOfTotal: 18.5,
    };

    const getCol = (header: string) => {
      const col = PRODUCT_SALES_EXPORT_COLUMNS.find((c) => c.header === header);
      if (!col) throw new Error(`Column "${header}" not found in PRODUCT_SALES_EXPORT_COLUMNS`);
      return col;
    };

    it("should have all 7 enriched product sales columns", () => {
      const headers = PRODUCT_SALES_EXPORT_COLUMNS.map((c) => c.header);
      expect(headers).toEqual([
        "Ranking",
        "Producto",
        "Categoría",
        "Unidades Vendidas",
        "Precio Promedio",
        "Ingresos Totales",
        "% Participación",
      ]);
    });

    it("should format Ranking with hash symbol", () => {
      const col = getCol("Ranking");
      expect(col.accessor!(sampleProduct)).toBe("#1");
      expect(col.accessor!({ ...sampleProduct, rank: undefined })).toBe("-");
    });

    it("should fallback category to 'General' if empty", () => {
      const col = getCol("Categoría");
      expect(col.accessor!(sampleProduct)).toBe("Bebidas");
      expect(col.accessor!({ ...sampleProduct, category: "" })).toBe("General");
    });

    it("should calculate and format Precio Promedio correctly", () => {
      const col = getCol("Precio Promedio");
      expect(col.accessor!(sampleProduct)).toBe("$65.00");

      const fallbackItem: EnrichedProductSaleItem = {
        ...sampleProduct,
        averageUnitPrice: undefined,
        quantity: 10,
        revenue: 450,
      };
      expect(col.accessor!(fallbackItem)).toBe("$45.00");

      const zeroQtyItem: EnrichedProductSaleItem = {
        ...sampleProduct,
        averageUnitPrice: undefined,
        quantity: 0,
        revenue: 0,
      };
      expect(col.accessor!(zeroQtyItem)).toBe("$0.00");
    });

    it("should format Ingresos Totales as currency", () => {
      const col = getCol("Ingresos Totales");
      expect(col.accessor!(sampleProduct)).toBe("$5525.00");
    });

    it("should format % Participación with percent symbol", () => {
      const col = getCol("% Participación");
      expect(col.accessor!(sampleProduct)).toBe("18.5%");
      expect(col.accessor!({ ...sampleProduct, percentageOfTotal: undefined })).toBe("-");
    });
  });

  describe("TOP_CUSTOMERS_EXPORT_COLUMNS", () => {
    const sampleCustomer: TopCustomerExport = {
      name: "Juan Pérez",
      totalSpend: 1250.75,
      loyaltyPoints: 120,
    };

    const getCol = (header: string) => {
      const col = TOP_CUSTOMERS_EXPORT_COLUMNS.find((c) => c.header === header);
      if (!col) throw new Error(`Column "${header}" not found in TOP_CUSTOMERS_EXPORT_COLUMNS`);
      return col;
    };

    it("should have all 3 top customer columns", () => {
      const headers = TOP_CUSTOMERS_EXPORT_COLUMNS.map((c) => c.header);
      expect(headers).toEqual(["Cliente", "Gasto Total", "Puntos Lealtad"]);
    });

    it("should format customer name with fallback", () => {
      const col = getCol("Cliente");
      expect(col.accessor!(sampleCustomer)).toBe("Juan Pérez");
      expect(col.accessor!({ name: "" })).toBe("Cliente");
    });

    it("should format total spend with fallback", () => {
      const col = getCol("Gasto Total");
      expect(col.accessor!(sampleCustomer)).toBe("$1250.75");
      expect(col.accessor!({ total_spend: 300 })).toBe("$300.00");
      expect(col.accessor!({})).toBe("$0.00");
    });

    it("should format loyalty points with fallback", () => {
      const col = getCol("Puntos Lealtad");
      expect(col.accessor!(sampleCustomer)).toBe(120);
      expect(col.accessor!({ loyalty_points: 50 })).toBe(50);
      expect(col.accessor!({})).toBe(0);
    });
  });
});

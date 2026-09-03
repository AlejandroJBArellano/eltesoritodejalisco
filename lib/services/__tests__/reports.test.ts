import { describe, it, expect } from "vitest";
import {
  calculateReportDates,
  transformTopCustomers,
  aggregateSalesData,
  RawReportOrder,
  RawCustomer,
} from "../reports";

describe("lib/services/reports", () => {
  describe("calculateReportDates", () => {
    const fixedBaseDate = new Date("2026-08-27T12:00:00-06:00");

    it("should calculate correct range for 'today'", () => {
      const { startDate, endDate, startIsoDate, endIsoDate } =
        calculateReportDates("today", null, null, fixedBaseDate);

      expect(startIsoDate).toBe("2026-08-27");
      expect(endIsoDate).toBe("2026-08-27");
      expect(startDate.getTime()).toBeLessThan(endDate!.getTime());
    });

    it("should calculate correct range for 'yesterday'", () => {
      const { startIsoDate, endIsoDate } = calculateReportDates(
        "yesterday",
        null,
        null,
        fixedBaseDate,
      );

      expect(startIsoDate).toBe("2026-08-26");
      expect(endIsoDate).toBe("2026-08-26");
    });

    it("should calculate correct range for '7days'", () => {
      const { startIsoDate, endIsoDate } = calculateReportDates(
        "7days",
        null,
        null,
        fixedBaseDate,
      );

      expect(startIsoDate).toBe("2026-08-21");
      expect(endIsoDate).toBe("2026-08-27");
    });

    it("should calculate correct range for '30days'", () => {
      const { startIsoDate, endIsoDate } = calculateReportDates(
        "30days",
        null,
        null,
        fixedBaseDate,
      );

      expect(startIsoDate).toBe("2026-07-29");
      expect(endIsoDate).toBe("2026-08-27");
    });

    it("should calculate correct range for 'custom'", () => {
      const { startIsoDate, endIsoDate } = calculateReportDates(
        "custom",
        "2026-08-01",
        "2026-08-15",
        fixedBaseDate,
      );

      expect(startIsoDate).toBe("2026-08-01");
      expect(endIsoDate).toBe("2026-08-15");
    });
  });

  describe("transformTopCustomers", () => {
    it("should correctly map snake_case db columns to camelCase properties", () => {
      const rawCustomers: RawCustomer[] = [
        {
          id: "cust-1",
          name: "Juan Perez",
          total_spend: 1250.5,
          loyalty_points: 125,
        },
        {
          id: "cust-2",
          name: "   ",
          total_spend: 50,
          loyalty_points: 5,
        },
        {
          id: "cust-3",
          name: null,
          total_spend: null,
          loyalty_points: null,
        },
      ];

      const result = transformTopCustomers(rawCustomers);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: "cust-1",
        name: "Juan Perez",
        totalSpend: 1250.5,
        loyaltyPoints: 125,
      });
      expect(result[1].name).toBe("Cliente");
      expect(result[2]).toEqual({
        id: "cust-3",
        name: "Cliente",
        totalSpend: 0,
        loyaltyPoints: 0,
      });
    });

    it("should return empty array for null or undefined input", () => {
      expect(transformTopCustomers(null)).toEqual([]);
      expect(transformTopCustomers(undefined)).toEqual([]);
    });
  });

  describe("aggregateSalesData", () => {
    it("should accurately aggregate sales, items, categories, and sources", () => {
      const rawOrders: RawReportOrder[] = [
        {
          id: "ord-1",
          total: 250,
          created_at: "2026-08-27T10:00:00-06:00",
          completed_at: "2026-08-27T10:15:00-06:00",
          source: "Comedor",
          status: "PAID",
          order_items: [
            {
              menu_item_id: "prod-1",
              quantity: 2,
              unit_price: 100,
              menu_items: { name: "Tacos al Pastor", category: "Tacos" },
            },
            {
              menu_item_id: "prod-2",
              quantity: 1,
              unit_price: 50,
              menu_items: { name: "Agua de Horchata", category: "Bebidas" },
            },
          ],
        },
        {
          id: "ord-2",
          total: 100,
          created_at: "2026-08-27T11:00:00-06:00",
          completed_at: "2026-08-27T11:10:00-06:00",
          source: "Pickup",
          status: "DELIVERED",
          order_items: [
            {
              menu_item_id: "prod-1",
              quantity: 1,
              unit_price: 100,
              menu_items: { name: "Tacos al Pastor", category: "Tacos" },
            },
          ],
        },
      ];

      const metrics = aggregateSalesData(rawOrders);

      expect(metrics.totalSales).toBe(350);
      expect(metrics.totalOrders).toBe(2);
      expect(metrics.averageTicket).toBe(175);
      expect(metrics.averageCompletionTimeMinutes).toBe(12.5); // (15 + 10) / 2
      expect(metrics.salesByDay["2026-08-27"]).toBe(350);
      expect(metrics.ordersByDay["2026-08-27"]).toBe(2);
      expect(metrics.salesBySource["Comedor"]).toEqual({ count: 1, total: 250 });
      expect(metrics.salesBySource["Pickup"]).toEqual({ count: 1, total: 100 });

      // Product sales check
      expect(metrics.productSales).toHaveLength(2);
      expect(metrics.productSales[0]).toEqual({
        id: "prod-1",
        name: "Tacos al Pastor",
        category: "Tacos",
        quantity: 3,
        revenue: 300,
      });

      // Categories check
      expect(metrics.categories).toContain("Tacos");
      expect(metrics.categories).toContain("Bebidas");
    });

    it("should handle empty or null order lists gracefully", () => {
      const metrics = aggregateSalesData([]);

      expect(metrics.totalSales).toBe(0);
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.averageTicket).toBe(0);
      expect(metrics.averageCompletionTimeMinutes).toBe(0);
      expect(metrics.productSales).toEqual([]);
      expect(metrics.topSellingItems).toEqual([]);
      expect(metrics.categories).toEqual([]);
    });

    it("should handle orders without order_items or menu_items gracefully", () => {
      const rawOrders: RawReportOrder[] = [
        {
          id: "ord-1",
          total: 80,
          created_at: "2026-08-27T10:00:00-06:00",
          completed_at: null,
          source: null,
          status: "PAID",
          order_items: null,
        },
      ];

      const metrics = aggregateSalesData(rawOrders);

      expect(metrics.totalSales).toBe(80);
      expect(metrics.totalOrders).toBe(1);
      expect(metrics.salesBySource["Desconocido"]).toEqual({ count: 1, total: 80 });
      expect(metrics.productSales).toEqual([]);
    });
  });
});

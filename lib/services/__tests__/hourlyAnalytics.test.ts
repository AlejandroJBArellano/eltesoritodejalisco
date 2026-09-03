import { describe, expect, it } from "vitest";
import {
  aggregateHourlySales,
  formatHourLabel,
  formatHourRangeLabel,
  getMexicoHourAndDay,
  HOURLY_SALES_EXPORT_COLUMNS,
  transformHourlyRowsToExportItems,
} from "../hourlyAnalytics";
import type { RawReportOrder } from "../reports";

describe("hourlyAnalytics service", () => {
  describe("formatHourLabel & formatHourRangeLabel", () => {
    it("should format hour label correctly", () => {
      expect(formatHourLabel(0)).toBe("00:00");
      expect(formatHourLabel(9)).toBe("09:00");
      expect(formatHourLabel(14)).toBe("14:00");
      expect(formatHourLabel(23)).toBe("23:00");
      expect(formatHourLabel(-5)).toBe("00:00");
      expect(formatHourLabel(30)).toBe("23:00");
    });

    it("should format hour range label correctly", () => {
      expect(formatHourRangeLabel(0)).toBe("00:00 - 00:59");
      expect(formatHourRangeLabel(14)).toBe("14:00 - 14:59");
      expect(formatHourRangeLabel(23)).toBe("23:00 - 23:59");
    });
  });

  describe("getMexicoHourAndDay", () => {
    it("should return null for invalid date inputs", () => {
      expect(getMexicoHourAndDay("invalid-date")).toBeNull();
      expect(getMexicoHourAndDay(new Date("invalid"))).toBeNull();
    });

    it("should correctly convert UTC timestamp to Mexico City local hour and day", () => {
      // 2026-09-03T20:30:00Z is 14:30 in CDMX (UTC-6), which is Thursday (Thu -> index 3)
      const res = getMexicoHourAndDay("2026-09-03T20:30:00Z");
      expect(res).not.toBeNull();
      expect(res?.hour).toBe(14);
      expect(res?.dayOfWeekIndex).toBe(3); // Jueves
      expect(res?.dateStr).toBe("2026-09-03");
    });

    it("should correctly handle midnight in CDMX", () => {
      // 2026-09-03T06:00:00Z is 00:00 CDMX
      const res = getMexicoHourAndDay("2026-09-03T06:00:00Z");
      expect(res).not.toBeNull();
      expect(res?.hour).toBe(0);
      expect(res?.dayOfWeekIndex).toBe(3);
    });

    it("should handle Date object input", () => {
      const d = new Date("2026-09-03T20:30:00Z");
      const res = getMexicoHourAndDay(d);
      expect(res).not.toBeNull();
      expect(res?.hour).toBe(14);
    });
  });

  describe("aggregateHourlySales", () => {
    it("should handle empty or null orders gracefully", () => {
      const result = aggregateHourlySales(null);
      expect(result.rows).toHaveLength(24);
      expect(result.peakHoursSummary.peakSalesHour).toBeNull();
      expect(result.peakHoursSummary.peakOrdersHour).toBeNull();
      expect(result.peakHoursSummary.peakTicketHour).toBeNull();
      expect(result.peakHoursSummary.rushWindow).toBeNull();
      expect(result.peakHoursSummary.totalPeriodSales).toBe(0);
      expect(result.peakHoursSummary.totalPeriodOrders).toBe(0);
      expect(result.heatmapCells).toHaveLength(7 * 24);
    });

    it("should aggregate single order correctly", () => {
      const orders: RawReportOrder[] = [
        {
          id: "order-1",
          total: 250,
          created_at: "2026-09-03T19:00:00Z", // 13:00 CDMX (Thursday)
          completed_at: "2026-09-03T19:20:00Z",
          source: "POS",
          status: "DELIVERED",
        },
      ];

      const result = aggregateHourlySales(orders);
      expect(result.rows).toHaveLength(24);

      const row13 = result.rows.find((r) => r.hour === 13);
      expect(row13).toBeDefined();
      expect(row13?.sales).toBe(250);
      expect(row13?.orders).toBe(1);
      expect(row13?.isPeakSales).toBe(true);
      expect(row13?.isPeakOrders).toBe(true);
      expect(row13?.percentageOfSales).toBe(100);

      expect(result.peakHoursSummary.peakSalesHour?.hour).toBe(13);
      expect(result.peakHoursSummary.peakSalesHour?.amount).toBe(250);
      expect(result.peakHoursSummary.peakOrdersHour?.hour).toBe(13);
      expect(result.peakHoursSummary.peakOrdersHour?.count).toBe(1);
      expect(result.peakHoursSummary.peakTicketHour?.hour).toBe(13);
      expect(result.peakHoursSummary.peakTicketHour?.averageTicket).toBe(250);
      expect(result.peakHoursSummary.rushWindow?.startHour).toBe(13);
      expect(result.peakHoursSummary.rushWindow?.endHour).toBe(16);
      expect(result.peakHoursSummary.rushWindow?.sales).toBe(250);
    });

    it("should filter onlyActiveHours when requested", () => {
      const orders: RawReportOrder[] = [
        {
          id: "order-1",
          total: 100,
          created_at: "2026-09-03T18:00:00Z", // 12:00 CDMX
          completed_at: null,
          source: null,
          status: "PAID",
        },
        {
          id: "order-2",
          total: 300,
          created_at: "2026-09-03T20:00:00Z", // 14:00 CDMX
          completed_at: null,
          source: null,
          status: "PAID",
        },
      ];

      const resultAll = aggregateHourlySales(orders, { onlyActiveHours: false });
      expect(resultAll.rows).toHaveLength(24);

      const resultActive = aggregateHourlySales(orders, {
        onlyActiveHours: true,
      });
      expect(resultActive.rows).toHaveLength(2);
      expect(resultActive.rows.map((r) => r.hour)).toEqual([12, 14]);
    });

    it("should handle empty orders with onlyActiveHours and default parameters", () => {
      const result = aggregateHourlySales([], { onlyActiveHours: true });
      expect(result.rows).toHaveLength(0);
      expect(result.peakHoursSummary.peakSalesHour).toBeNull();
    });

    it("should compute average mode over multiple distinct days", () => {
      const orders: RawReportOrder[] = [
        // Day 1 at 14:00 CDMX
        {
          id: "o1",
          total: 100,
          created_at: "2026-09-01T20:00:00Z",
          completed_at: null,
          source: null,
          status: "PAID",
        },
        // Day 2 at 14:00 CDMX
        {
          id: "o2",
          total: 200,
          created_at: "2026-09-02T20:00:00Z",
          completed_at: null,
          source: null,
          status: "PAID",
        },
      ];

      const sumResult = aggregateHourlySales(orders, { mode: "sum" });
      const row14Sum = sumResult.rows.find((r) => r.hour === 14);
      expect(row14Sum?.sales).toBe(300);
      expect(row14Sum?.orders).toBe(2);

      const avgResult = aggregateHourlySales(orders, { mode: "average" });
      const row14Avg = avgResult.rows.find((r) => r.hour === 14);
      expect(avgResult.peakHoursSummary.daysInPeriod).toBe(2);
      expect(row14Avg?.sales).toBe(150); // 300 / 2 days
      expect(row14Avg?.orders).toBe(1); // 2 / 2 days
    });

    it("should calculate best rush window across 3 continuous hours", () => {
      const orders: RawReportOrder[] = [
        // 13:00 CDMX: $500
        {
          id: "o1",
          total: 500,
          created_at: "2026-09-03T19:00:00Z",
          completed_at: null,
          source: null,
          status: "PAID",
        },
        // 14:00 CDMX: $800
        {
          id: "o2",
          total: 800,
          created_at: "2026-09-03T20:00:00Z",
          completed_at: null,
          source: null,
          status: "PAID",
        },
        // 15:00 CDMX: $700
        {
          id: "o3",
          total: 700,
          created_at: "2026-09-03T21:00:00Z",
          completed_at: null,
          source: null,
          status: "PAID",
        },
        // 20:00 CDMX: $1000
        {
          id: "o4",
          total: 1000,
          created_at: "2026-09-04T02:00:00Z", // wait, 02:00 UTC next day is 20:00 CDMX
          completed_at: null,
          source: null,
          status: "PAID",
        },
      ];

      const result = aggregateHourlySales(orders);
      // Window 13-16 sum: 500 + 800 + 700 = 2000.
      // Window 19-22 sum: 0 + 1000 + 0 = 1000.
      expect(result.peakHoursSummary.rushWindow).not.toBeNull();
      expect(result.peakHoursSummary.rushWindow?.startHour).toBe(13);
      expect(result.peakHoursSummary.rushWindow?.endHour).toBe(16);
      expect(result.peakHoursSummary.rushWindow?.sales).toBe(2000);
      expect(result.peakHoursSummary.rushWindow?.orders).toBe(3);
    });

    it("should generate heatmap cells with proper weekday and intensity", () => {
      const orders: RawReportOrder[] = [
        // Thursday (index 3) at 14:00 CDMX: $1000
        {
          id: "o1",
          total: 1000,
          created_at: "2026-09-03T20:00:00Z",
          completed_at: null,
          source: null,
          status: "PAID",
        },
        // Friday (index 4) at 14:00 CDMX: $500
        {
          id: "o2",
          total: 500,
          created_at: "2026-09-04T20:00:00Z",
          completed_at: null,
          source: null,
          status: "PAID",
        },
      ];

      const result = aggregateHourlySales(orders);
      const cells = result.heatmapCells;
      expect(cells).toHaveLength(7 * 24);

      const cellThu14 = cells.find((c) => c.dayIndex === 3 && c.hour === 14);
      expect(cellThu14).toBeDefined();
      expect(cellThu14?.sales).toBe(1000);
      expect(cellThu14?.intensity).toBe(1); // maximum

      const cellFri14 = cells.find((c) => c.dayIndex === 4 && c.hour === 14);
      expect(cellFri14).toBeDefined();
      expect(cellFri14?.sales).toBe(500);
      expect(cellFri14?.intensity).toBe(0.5);

      const cellMon10 = cells.find((c) => c.dayIndex === 0 && c.hour === 10);
      expect(cellMon10?.intensity).toBe(0);
    });

    it("should ignore orders without created_at or invalid dates", () => {
      const orders: RawReportOrder[] = [
        {
          id: "o1",
          total: 100,
          created_at: "",
          completed_at: null,
          source: null,
          status: "PAID",
        },
        {
          id: "o2",
          total: 100,
          created_at: "invalid-date-string",
          completed_at: null,
          source: null,
          status: "PAID",
        },
      ];

      const result = aggregateHourlySales(orders);
      expect(result.peakHoursSummary.totalPeriodSales).toBe(0);
      expect(result.peakHoursSummary.totalPeriodOrders).toBe(0);
    });
  });

  describe("transformHourlyRowsToExportItems & HOURLY_SALES_EXPORT_COLUMNS", () => {
    it("should assign correct peak indicators based on flags", () => {
      const dummyRows = [
        {
          hour: 12,
          hourLabel: "12:00",
          displayHour: "12:00",
          sales: 500,
          orders: 5,
          rawSales: 500,
          rawOrders: 5,
          averageTicket: 100,
          percentageOfSales: 50,
          percentageOfOrders: 50,
          isPeakSales: true,
          isPeakOrders: true,
          isHighActivity: true,
        },
        {
          hour: 13,
          hourLabel: "13:00",
          displayHour: "13:00",
          sales: 400,
          orders: 2,
          rawSales: 400,
          rawOrders: 2,
          averageTicket: 200,
          percentageOfSales: 40,
          percentageOfOrders: 20,
          isPeakSales: true,
          isPeakOrders: false,
          isHighActivity: true,
        },
        {
          hour: 14,
          hourLabel: "14:00",
          displayHour: "14:00",
          sales: 100,
          orders: 4,
          rawSales: 100,
          rawOrders: 4,
          averageTicket: 25,
          percentageOfSales: 10,
          percentageOfOrders: 40,
          isPeakSales: false,
          isPeakOrders: true,
          isHighActivity: false,
        },
        {
          hour: 15,
          hourLabel: "15:00",
          displayHour: "15:00",
          sales: 350,
          orders: 3,
          rawSales: 350,
          rawOrders: 3,
          averageTicket: 116.67,
          percentageOfSales: 35,
          percentageOfOrders: 30,
          isPeakSales: false,
          isPeakOrders: false,
          isHighActivity: true,
        },
        {
          hour: 16,
          hourLabel: "16:00",
          displayHour: "16:00",
          sales: 50,
          orders: 1,
          rawSales: 50,
          rawOrders: 1,
          averageTicket: 50,
          percentageOfSales: 5,
          percentageOfOrders: 10,
          isPeakSales: false,
          isPeakOrders: false,
          isHighActivity: false,
        },
        {
          hour: 17,
          hourLabel: "17:00",
          displayHour: "17:00",
          sales: 0,
          orders: 0,
          rawSales: 0,
          rawOrders: 0,
          averageTicket: 0,
          percentageOfSales: 0,
          percentageOfOrders: 0,
          isPeakSales: false,
          isPeakOrders: false,
          isHighActivity: false,
        },
      ];

      const exportItems = transformHourlyRowsToExportItems(dummyRows);
      expect(exportItems[0].peakIndicator).toBe("Pico Ventas & Pedidos 🔥⚡");
      expect(exportItems[1].peakIndicator).toBe("Pico de Ventas ⚡");
      expect(exportItems[2].peakIndicator).toBe("Pico de Pedidos 🔥");
      expect(exportItems[3].peakIndicator).toBe("Alta Actividad");
      expect(exportItems[4].peakIndicator).toBe("Normal");
      expect(exportItems[5].peakIndicator).toBe("Sin Actividad");
    });

    it("should format export columns accessor functions correctly", () => {
      const testItem = {
        hour: "14:00 - 14:59",
        sales: 1250.5,
        percentage: 33.456,
        orders: 12,
        averageTicket: 104.208,
        peakIndicator: "Pico de Ventas ⚡",
      };

      const salesCol = HOURLY_SALES_EXPORT_COLUMNS.find((c) => c.header === "Ventas");
      const pctCol = HOURLY_SALES_EXPORT_COLUMNS.find((c) => c.header === "% del Total");
      const ticketCol = HOURLY_SALES_EXPORT_COLUMNS.find(
        (c) => c.header === "Ticket Promedio",
      );

      expect(salesCol?.accessor?.(testItem)).toBe("$1250.50");
      expect(pctCol?.accessor?.(testItem)).toBe("33.5%");
      expect(ticketCol?.accessor?.(testItem)).toBe("$104.21");
    });
  });
});

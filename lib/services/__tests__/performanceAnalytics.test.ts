import { describe, it, expect } from "vitest";
import {
  generateLast12Months,
  aggregatePerformanceData,
  SPANISH_MONTHS,
} from "../performanceAnalytics";
import type { RawReportOrder } from "../reports";

describe("performanceAnalytics Service", () => {
  const fixedBaseDate = new Date("2026-09-06T12:00:00-06:00");

  describe("generateLast12Months", () => {
    it("generates exactly 12 months ending at the base date month", () => {
      const months = generateLast12Months(fixedBaseDate);
      expect(months).toHaveLength(12);

      // Earliest should be 2025-10
      expect(months[0].monthKey).toBe("2025-10");
      expect(months[0].shortMonthName).toBe("Oct");
      expect(months[0].year).toBe(2025);

      // Latest should be 2026-09
      expect(months[11].monthKey).toBe("2026-09");
      expect(months[11].shortMonthName).toBe("Sep");
      expect(months[11].year).toBe(2026);
    });

    it("works with default date parameter", () => {
      const months = generateLast12Months();
      expect(months).toHaveLength(12);
      expect(SPANISH_MONTHS).toHaveLength(12);
    });
  });

  describe("aggregatePerformanceData", () => {
    it("handles empty or null inputs gracefully", () => {
      const result = aggregatePerformanceData(null, null, fixedBaseDate);

      expect(result.kpis.periodAverageTicket).toBe(0);
      expect(result.kpis.totalPeriodSales).toBe(0);
      expect(result.kpis.totalPeriodOrders).toBe(0);
      expect(result.kpis.bestWeekday).toBeNull();
      expect(result.kpis.recordMonth).toBeNull();
      expect(result.dailyTickets).toEqual([]);
      expect(result.weekdaySales).toHaveLength(7);
      expect(result.monthlySales).toHaveLength(12);
    });

    it("aggregates daily tickets, weekdays and historical months accurately", () => {
      // 2026-09-01 is Tuesday (dayIndex 1)
      // 2026-09-02 is Wednesday (dayIndex 2)
      // 2026-09-08 is Tuesday (dayIndex 1)
      const periodOrders: RawReportOrder[] = [
        {
          id: "o1",
          total: 200,
          created_at: "2026-09-01T10:00:00-06:00",
          completed_at: "2026-09-01T10:15:00-06:00",
          source: "POS",
          status: "DELIVERED",
        },
        {
          id: "o2",
          total: 300,
          created_at: "2026-09-01T14:00:00-06:00",
          completed_at: "2026-09-01T14:20:00-06:00",
          source: "POS",
          status: "DELIVERED",
        },
        {
          id: "o3",
          total: 150,
          created_at: "2026-09-02T11:00:00-06:00",
          completed_at: "2026-09-02T11:30:00-06:00",
          source: "POS",
          status: "PAID",
        },
        {
          id: "o4",
          total: 400,
          created_at: "2026-09-08T12:00:00-06:00",
          completed_at: "2026-09-08T12:20:00-06:00",
          source: "POS",
          status: "DELIVERED",
        },
      ];

      const historicalOrders: RawReportOrder[] = [
        ...periodOrders,
        {
          id: "h1",
          total: 1000,
          created_at: "2026-08-15T15:00:00-06:00",
          completed_at: "2026-08-15T15:30:00-06:00",
          source: "POS",
          status: "DELIVERED",
        },
        {
          id: "h2",
          total: 500,
          created_at: "2026-07-10T12:00:00-06:00",
          completed_at: "2026-07-10T12:20:00-06:00",
          source: "POS",
          status: "DELIVERED",
        },
      ];

      const result = aggregatePerformanceData(
        periodOrders,
        historicalOrders,
        fixedBaseDate,
      );

      // Period sales: 200 + 300 + 150 + 400 = 1050
      // Period orders: 4
      // Period average ticket: 1050 / 4 = 262.5
      expect(result.kpis.totalPeriodSales).toBe(1050);
      expect(result.kpis.totalPeriodOrders).toBe(4);
      expect(result.kpis.periodAverageTicket).toBe(262.5);

      // Daily tickets
      expect(result.dailyTickets).toHaveLength(3);
      expect(result.dailyTickets[0]).toEqual({
        date: "2026-09-01",
        label: expect.any(String),
        sales: 500,
        orders: 2,
        averageTicket: 250,
      });
      expect(result.dailyTickets[1]).toEqual({
        date: "2026-09-02",
        label: expect.any(String),
        sales: 150,
        orders: 1,
        averageTicket: 150,
      });
      expect(result.dailyTickets[2]).toEqual({
        date: "2026-09-08",
        label: expect.any(String),
        sales: 400,
        orders: 1,
        averageTicket: 400,
      });

      // Weekday sales
      // Tuesday (index 1): 2 distinct days (Sep 1 and Sep 8)
      // Total sales: 500 + 400 = 900
      // Day count: 2
      // Average sales: 450
      const tuesday = result.weekdaySales.find((d) => d.dayIndex === 1);
      expect(tuesday).toBeDefined();
      expect(tuesday?.name).toBe("Martes");
      expect(tuesday?.totalSales).toBe(900);
      expect(tuesday?.totalOrders).toBe(3);
      expect(tuesday?.dayCount).toBe(2);
      expect(tuesday?.averageSales).toBe(450);
      expect(tuesday?.averageTicket).toBe(300);
      expect(tuesday?.isBestDay).toBe(true);

      // Best day in KPIs
      expect(result.kpis.bestWeekday).toEqual({
        name: "Martes",
        shortName: "Mar",
        totalSales: 900,
        averageSales: 450,
        averageTicket: 300,
      });

      // Monthly sales check
      // August 2026: 1000
      // September 2026: 1050
      // Growth from Aug (1000) to Sep (1050) = +5%
      const aug = result.monthlySales.find((m) => m.monthKey === "2026-08");
      const sep = result.monthlySales.find((m) => m.monthKey === "2026-09");
      expect(aug?.totalSales).toBe(1000);
      expect(sep?.totalSales).toBe(1050);
      expect(sep?.growthPercentage).toBe(5);

      // Record month
      expect(result.kpis.recordMonth?.monthName).toBe("Sep 2026");
      expect(result.kpis.recordMonth?.totalSales).toBe(1050);
    });

    it("ignores orders with missing created_at or invalid dates", () => {
      const ordersWithBadDates = [
        {
          id: "bad1",
          total: 100,
          created_at: "",
          status: "DELIVERED",
        },
        {
          id: "bad2",
          total: 200,
          created_at: "invalid-date-string",
          status: "DELIVERED",
        },
      ] as RawReportOrder[];

      const result = aggregatePerformanceData(
        ordersWithBadDates,
        ordersWithBadDates,
        fixedBaseDate,
      );
      expect(result.kpis.totalPeriodSales).toBe(0);
      expect(result.dailyTickets).toHaveLength(0);
    });
  });
});

import { MEX_TIMEZONE } from "@/lib/utils";
import type { RawReportOrder } from "@/lib/services/reports";
import { getMexicoDateStr } from "@/lib/services/reports";
import { DAYS_OF_WEEK, getMexicoHourAndDay } from "@/lib/services/hourlyAnalytics";

export interface DailyTicketRow {
  date: string;
  label: string;
  sales: number;
  orders: number;
  averageTicket: number;
}

export interface WeekdayOccurrence {
  date: string;
  label: string;
  sales: number;
  orders: number;
  averageTicket: number;
}

export interface WeekdayHistoricalBaseline {
  averageTicket: number;
  averageSales: number;
  averageOrders: number;
  totalOccurrences: number;
}

export interface WeekdaySalesRow {
  dayIndex: number;
  name: string;
  shortName: string;
  totalSales: number;
  totalOrders: number;
  dayCount: number;
  averageSales: number;
  averageTicket: number;
  percentageOfSales: number;
  isBestDay: boolean;
  historicalBaseline: WeekdayHistoricalBaseline;
  occurrences: WeekdayOccurrence[];
}

export interface MonthlySalesRow {
  monthKey: string;
  monthName: string;
  shortMonthName: string;
  year: number;
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  growthPercentage: number | null;
  isRecordMonth: boolean;
}

export interface PerformanceKPIs {
  periodAverageTicket: number;
  totalPeriodSales: number;
  totalPeriodOrders: number;
  bestWeekday: {
    name: string;
    shortName: string;
    totalSales: number;
    averageSales: number;
    averageTicket: number;
  } | null;
  recordMonth: {
    monthName: string;
    totalSales: number;
    orders: number;
    averageTicket: number;
  } | null;
}

export interface PerformanceAnalyticsResult {
  kpis: PerformanceKPIs;
  dailyTickets: DailyTicketRow[];
  weekdaySales: WeekdaySalesRow[];
  monthlySales: MonthlySalesRow[];
}

export const SPANISH_MONTHS = [
  { index: 0, name: "Enero", short: "Ene" },
  { index: 1, name: "Febrero", short: "Feb" },
  { index: 2, name: "Marzo", short: "Mar" },
  { index: 3, name: "Abril", short: "Abr" },
  { index: 4, name: "Mayo", short: "May" },
  { index: 5, name: "Junio", short: "Jun" },
  { index: 6, name: "Julio", short: "Jul" },
  { index: 7, name: "Agosto", short: "Ago" },
  { index: 8, name: "Septiembre", short: "Sep" },
  { index: 9, name: "Octubre", short: "Oct" },
  { index: 10, name: "Noviembre", short: "Nov" },
  { index: 11, name: "Diciembre", short: "Dic" },
];

export function generateLast12Months(baseDate: Date = new Date()): MonthlySalesRow[] {
  const mxBase = getMexicoDateStr(baseDate);
  const [currentYearStr, currentMonthStr] = mxBase.split("-");
  const baseYear = parseInt(currentYearStr, 10);
  const baseMonth = parseInt(currentMonthStr, 10) - 1; // 0-11

  const months: MonthlySalesRow[] = [];
  for (let i = 11; i >= 0; i--) {
    let year = baseYear;
    let monthIndex = baseMonth - i;
    while (monthIndex < 0) {
      monthIndex += 12;
      year -= 1;
    }
    const monthDef = SPANISH_MONTHS[monthIndex];
    const monthNumStr = String(monthIndex + 1).padStart(2, "0");
    const monthKey = `${year}-${monthNumStr}`;
    const monthName = `${monthDef.short} ${year}`;

    months.push({
      monthKey,
      monthName,
      shortMonthName: monthDef.short,
      year,
      totalSales: 0,
      totalOrders: 0,
      averageTicket: 0,
      growthPercentage: null,
      isRecordMonth: false,
    });
  }
  return months;
}

export function aggregatePerformanceData(
  periodOrders: RawReportOrder[] | null | undefined,
  historicalOrders: RawReportOrder[] | null | undefined,
  baseDate: Date = new Date(),
): PerformanceAnalyticsResult {
  const typedPeriodOrders = periodOrders || [];
  const typedHistoricalOrders = historicalOrders || [];

  // --- 1. Daily Ticket & Period KPIs Trackers ---
  const dailyMap: Record<string, { sales: number; orders: number }> = {};
  let totalPeriodSales = 0;
  let totalPeriodOrders = 0;

  const weekdayDatesSets: Record<number, Set<string>> = {
    0: new Set(),
    1: new Set(),
    2: new Set(),
    3: new Set(),
    4: new Set(),
    5: new Set(),
    6: new Set(),
  };

  const weekdayTotals: Record<number, { sales: number; orders: number }> = {
    0: { sales: 0, orders: 0 },
    1: { sales: 0, orders: 0 },
    2: { sales: 0, orders: 0 },
    3: { sales: 0, orders: 0 },
    4: { sales: 0, orders: 0 },
    5: { sales: 0, orders: 0 },
    6: { sales: 0, orders: 0 },
  };

  const weekdayOccurrencesMap: Record<
    number,
    Record<string, { sales: number; orders: number }>
  > = {
    0: {},
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {},
  };

  typedPeriodOrders.forEach((order) => {
    if (!order.created_at) return;
    const amount = Number(order.total || 0);
    const parsed = getMexicoHourAndDay(order.created_at);
    if (!parsed) return;

    const { dateStr, dayOfWeekIndex } = parsed;

    // Daily
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { sales: 0, orders: 0 };
    }
    dailyMap[dateStr].sales += amount;
    dailyMap[dateStr].orders += 1;

    totalPeriodSales += amount;
    totalPeriodOrders += 1;

    // Weekday in period
    weekdayTotals[dayOfWeekIndex].sales += amount;
    weekdayTotals[dayOfWeekIndex].orders += 1;
    weekdayDatesSets[dayOfWeekIndex].add(dateStr);

    if (!weekdayOccurrencesMap[dayOfWeekIndex][dateStr]) {
      weekdayOccurrencesMap[dayOfWeekIndex][dateStr] = { sales: 0, orders: 0 };
    }
    weekdayOccurrencesMap[dayOfWeekIndex][dateStr].sales += amount;
    weekdayOccurrencesMap[dayOfWeekIndex][dateStr].orders += 1;
  });

  const periodAverageTicket =
    totalPeriodOrders > 0
      ? Math.round((totalPeriodSales / totalPeriodOrders) * 100) / 100
      : 0;

  // Build sorted daily tickets list
  const dailyTickets: DailyTicketRow[] = Object.keys(dailyMap)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const { sales, orders } = dailyMap[date];
      const avgTicket = orders > 0 ? Math.round((sales / orders) * 100) / 100 : 0;
      const labelDate = new Date(`${date}T12:00:00-06:00`);
      const label = labelDate.toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        timeZone: MEX_TIMEZONE,
      });
      return {
        date,
        label,
        sales: Math.round(sales * 100) / 100,
        orders,
        averageTicket: avgTicket,
      };
    });

  // --- 2. Historical Processing (Months & Weekday Baselines) ---
  const monthlyRows = generateLast12Months(baseDate);
  const monthMap: Record<string, MonthlySalesRow> = {};
  monthlyRows.forEach((m) => {
    monthMap[m.monthKey] = m;
  });

  const historicalDatesSets: Record<number, Set<string>> = {
    0: new Set(),
    1: new Set(),
    2: new Set(),
    3: new Set(),
    4: new Set(),
    5: new Set(),
    6: new Set(),
  };

  const historicalWeekdayTotals: Record<
    number,
    { sales: number; orders: number }
  > = {
    0: { sales: 0, orders: 0 },
    1: { sales: 0, orders: 0 },
    2: { sales: 0, orders: 0 },
    3: { sales: 0, orders: 0 },
    4: { sales: 0, orders: 0 },
    5: { sales: 0, orders: 0 },
    6: { sales: 0, orders: 0 },
  };

  typedHistoricalOrders.forEach((order) => {
    if (!order.created_at) return;
    const amount = Number(order.total || 0);
    const parsed = getMexicoHourAndDay(order.created_at);
    if (!parsed) return;

    const { dateStr, dayOfWeekIndex } = parsed;

    // Weekday historical totals
    historicalWeekdayTotals[dayOfWeekIndex].sales += amount;
    historicalWeekdayTotals[dayOfWeekIndex].orders += 1;
    historicalDatesSets[dayOfWeekIndex].add(dateStr);

    // Monthly historical totals
    const monthKey = dateStr.substring(0, 7); // YYYY-MM
    if (monthMap[monthKey]) {
      monthMap[monthKey].totalSales += amount;
      monthMap[monthKey].totalOrders += 1;
    }
  });

  // --- 3. Weekday Sales & Baselines ---
  let maxWeekdaySales = 0;
  let bestDayIndex = -1;

  const weekdayRowsPre = DAYS_OF_WEEK.map((day) => {
    const totals = weekdayTotals[day.index];
    const occurrencesCount = Math.max(weekdayDatesSets[day.index].size, 1);
    const avgSales = Math.round((totals.sales / occurrencesCount) * 100) / 100;
    const avgTicket =
      totals.orders > 0
        ? Math.round((totals.sales / totals.orders) * 100) / 100
        : 0;
    const percentage =
      totalPeriodSales > 0
        ? Math.round((totals.sales / totalPeriodSales) * 1000) / 10
        : 0;

    if (totals.sales > maxWeekdaySales) {
      maxWeekdaySales = totals.sales;
      bestDayIndex = day.index;
    }

    // Historical baseline for this weekday
    const histOccurrences = Math.max(historicalDatesSets[day.index].size, 1);
    const histSales = historicalWeekdayTotals[day.index].sales;
    const histOrders = historicalWeekdayTotals[day.index].orders;
    const histAvgSales = Math.round((histSales / histOccurrences) * 100) / 100;
    const histAvgOrders = Math.round((histOrders / histOccurrences) * 10) / 10;
    const histAvgTicket =
      histOrders > 0
        ? Math.round((histSales / histOrders) * 100) / 100
        : 0;

    // Period occurrences sorted chronologically
    const occurrences: WeekdayOccurrence[] = Object.keys(
      weekdayOccurrencesMap[day.index],
    )
      .sort((a, b) => a.localeCompare(b))
      .map((date) => {
        const { sales, orders } = weekdayOccurrencesMap[day.index][date];
        const occAvgTicket =
          orders > 0 ? Math.round((sales / orders) * 100) / 100 : 0;
        const labelDate = new Date(`${date}T12:00:00-06:00`);
        const label = labelDate.toLocaleDateString("es-MX", {
          weekday: "short",
          day: "numeric",
          month: "short",
          timeZone: MEX_TIMEZONE,
        });
        return {
          date,
          label,
          sales: Math.round(sales * 100) / 100,
          orders,
          averageTicket: occAvgTicket,
        };
      });

    return {
      dayIndex: day.index,
      name: day.name,
      shortName: day.short,
      totalSales: Math.round(totals.sales * 100) / 100,
      totalOrders: totals.orders,
      dayCount: occurrencesCount,
      averageSales: avgSales,
      averageTicket: avgTicket,
      percentageOfSales: percentage,
      isBestDay: false,
      historicalBaseline: {
        averageTicket: histAvgTicket,
        averageSales: histAvgSales,
        averageOrders: histAvgOrders,
        totalOccurrences: histOccurrences,
      },
      occurrences,
    };
  });

  const weekdaySales: WeekdaySalesRow[] = weekdayRowsPre.map((row) => ({
    ...row,
    isBestDay: maxWeekdaySales > 0 && row.dayIndex === bestDayIndex,
  }));

  const bestWeekdayObj =
    bestDayIndex >= 0 && maxWeekdaySales > 0
      ? {
          name: weekdaySales[bestDayIndex].name,
          shortName: weekdaySales[bestDayIndex].shortName,
          totalSales: weekdaySales[bestDayIndex].totalSales,
          averageSales: weekdaySales[bestDayIndex].averageSales,
          averageTicket: weekdaySales[bestDayIndex].averageTicket,
        }
      : null;

  // --- 4. Monthly Rows Processing ---
  let recordSales = 0;
  let recordMonthKey = "";

  monthlyRows.forEach((m, idx) => {
    m.totalSales = Math.round(m.totalSales * 100) / 100;
    m.averageTicket =
      m.totalOrders > 0
        ? Math.round((m.totalSales / m.totalOrders) * 100) / 100
        : 0;

    if (m.totalSales > recordSales) {
      recordSales = m.totalSales;
      recordMonthKey = m.monthKey;
    }

    if (idx > 0) {
      const prev = monthlyRows[idx - 1];
      if (prev.totalSales > 0) {
        const growth =
          ((m.totalSales - prev.totalSales) / prev.totalSales) * 100;
        m.growthPercentage = Math.round(growth * 10) / 10;
      } else if (m.totalSales > 0) {
        m.growthPercentage = 100;
      }
    }
  });

  if (recordSales > 0 && recordMonthKey) {
    monthlyRows.forEach((m) => {
      if (m.monthKey === recordMonthKey) {
        m.isRecordMonth = true;
      }
    });
  }

  const recordMonthObj =
    recordSales > 0 && recordMonthKey && monthMap[recordMonthKey]
      ? {
          monthName: monthMap[recordMonthKey].monthName,
          totalSales: monthMap[recordMonthKey].totalSales,
          orders: monthMap[recordMonthKey].totalOrders,
          averageTicket: monthMap[recordMonthKey].averageTicket,
        }
      : null;

  return {
    kpis: {
      periodAverageTicket,
      totalPeriodSales: Math.round(totalPeriodSales * 100) / 100,
      totalPeriodOrders,
      bestWeekday: bestWeekdayObj,
      recordMonth: recordMonthObj,
    },
    dailyTickets,
    weekdaySales,
    monthlySales: monthlyRows,
  };
}

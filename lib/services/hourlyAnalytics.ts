import { MEX_TIMEZONE } from "@/lib/utils";
import type { ExportColumn } from "@/components/ui/DataTableControls";
import type { RawReportOrder } from "@/lib/services/reports";

export type HourlyAggregationMode = "sum" | "average";

export interface HourlySalesRow {
  hour: number;
  hourLabel: string;
  displayHour: string;
  sales: number;
  orders: number;
  rawSales: number;
  rawOrders: number;
  averageTicket: number;
  percentageOfSales: number;
  percentageOfOrders: number;
  isPeakSales: boolean;
  isPeakOrders: boolean;
  isHighActivity: boolean;
}

export interface HeatmapCell {
  dayIndex: number; // 0 = Lunes, ..., 6 = Domingo
  dayName: string;
  dayShort: string;
  hour: number;
  hourLabel: string;
  sales: number;
  orders: number;
  intensity: number; // 0 to 1 relative to maximum
}

export interface PeakHoursSummary {
  peakSalesHour: {
    hour: number;
    label: string;
    amount: number;
    percentage: number;
  } | null;
  peakOrdersHour: {
    hour: number;
    label: string;
    count: number;
    percentage: number;
  } | null;
  peakTicketHour: {
    hour: number;
    label: string;
    averageTicket: number;
    ordersCount: number;
  } | null;
  rushWindow: {
    startHour: number;
    endHour: number;
    label: string;
    sales: number;
    percentage: number;
    orders: number;
  } | null;
  activeHoursCount: number;
  totalPeriodSales: number;
  totalPeriodOrders: number;
  daysInPeriod: number;
}

export interface HourlySaleExportItem {
  hour: string;
  sales: number;
  percentage: number;
  orders: number;
  averageTicket: number;
  peakIndicator: string;
}

export const DAYS_OF_WEEK = [
  { index: 0, name: "Lunes", short: "Lun" },
  { index: 1, name: "Martes", short: "Mar" },
  { index: 2, name: "Miércoles", short: "Mié" },
  { index: 3, name: "Jueves", short: "Jue" },
  { index: 4, name: "Viernes", short: "Vie" },
  { index: 5, name: "Sábado", short: "Sáb" },
  { index: 6, name: "Domingo", short: "Dom" },
];

export function formatHourLabel(hour: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  return `${String(h).padStart(2, "0")}:00`;
}

export function formatHourRangeLabel(hour: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  return `${String(h).padStart(2, "0")}:00 - ${String(h).padStart(2, "0")}:59`;
}

export function getMexicoHourAndDay(
  dateInput: string | Date,
): { hour: number; dayOfWeekIndex: number; dateStr: string } | null {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MEX_TIMEZONE,
    hour: "numeric",
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  let hour = parseInt(partMap.hour, 10);
  if (isNaN(hour) || hour === 24) hour = 0;

  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const dayOfWeekIndex = weekdayMap[partMap.weekday] ?? 0;
  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;

  return { hour, dayOfWeekIndex, dateStr };
}

export interface AggregateHourlyOptions {
  mode?: HourlyAggregationMode;
  onlyActiveHours?: boolean;
}

export function aggregateHourlySales(
  orders: RawReportOrder[] | null | undefined,
  options: AggregateHourlyOptions = {},
) {
  const { mode = "sum", onlyActiveHours = false } = options;
  const typedOrders = orders || [];

  const rawHourlySales: number[] = new Array(24).fill(0);
  const rawHourlyOrders: number[] = new Array(24).fill(0);
  const uniqueDates = new Set<string>();

  // Matriz de 7 días x 24 horas para el heatmap
  // heatmapRaw[dayIndex][hour] = { sales, orders }
  const heatmapRaw: Array<Array<{ sales: number; orders: number }>> = Array.from(
    { length: 7 },
    () => Array.from({ length: 24 }, () => ({ sales: 0, orders: 0 })),
  );

  let totalPeriodSales = 0;
  let totalPeriodOrders = 0;

  typedOrders.forEach((order) => {
    if (!order.created_at) return;
    const info = getMexicoHourAndDay(order.created_at);
    if (!info) return;

    const { hour, dayOfWeekIndex, dateStr } = info;
    const amount = Number(order.total || 0);

    uniqueDates.add(dateStr);
    rawHourlySales[hour] += amount;
    rawHourlyOrders[hour] += 1;
    totalPeriodSales += amount;
    totalPeriodOrders += 1;

    heatmapRaw[dayOfWeekIndex][hour].sales += amount;
    heatmapRaw[dayOfWeekIndex][hour].orders += 1;
  });

  const daysInPeriod = Math.max(1, uniqueDates.size);
  const divisor = mode === "average" ? daysInPeriod : 1;

  // Encontrar valores máximos para determinar picos
  let maxSales = 0;
  let maxSalesHour = -1;
  let maxOrders = 0;
  let maxOrdersHour = -1;
  let maxTicket = 0;
  let maxTicketHour = -1;

  for (let h = 0; h < 24; h++) {
    const s = rawHourlySales[h];
    const o = rawHourlyOrders[h];
    if (s > maxSales) {
      maxSales = s;
      maxSalesHour = h;
    }
    if (o > maxOrders) {
      maxOrders = o;
      maxOrdersHour = h;
    }
    if (o > 0) {
      const avg = s / o;
      if (avg > maxTicket) {
        maxTicket = avg;
        maxTicketHour = h;
      }
    }
  }

  // Detección de la ventana "Rush" de 3 horas continuas de mayor volumen/ingreso
  let bestRushWindow: {
    startHour: number;
    endHour: number;
    sales: number;
    orders: number;
  } | null = null;

  if (totalPeriodSales > 0 || totalPeriodOrders > 0) {
    let maxWindowSales = -1;
    for (let h = 0; h <= 21; h++) {
      const wSales =
        rawHourlySales[h] + rawHourlySales[h + 1] + rawHourlySales[h + 2];
      const wOrders =
        rawHourlyOrders[h] + rawHourlyOrders[h + 1] + rawHourlyOrders[h + 2];
      const isBetter =
        wSales > maxWindowSales ||
        (wSales === maxWindowSales &&
          bestRushWindow &&
          (h === maxSalesHour ||
            Math.abs(h - maxSalesHour) <
              Math.abs(bestRushWindow.startHour - maxSalesHour)));

      if (isBetter) {
        maxWindowSales = wSales;
        bestRushWindow = {
          startHour: h,
          endHour: h + 3,
          sales: wSales / divisor,
          orders: wOrders / divisor,
        };
      }
    }
  }

  // Generar filas para el gráfico de barras y tabla
  const allRows: HourlySalesRow[] = [];
  let activeHoursCount = 0;

  for (let h = 0; h < 24; h++) {
    const rawSales = rawHourlySales[h];
    const rawOrders = rawHourlyOrders[h];
    if (rawOrders > 0 || rawSales > 0) {
      activeHoursCount++;
    }

    const sales = rawSales / divisor;
    const orders = rawOrders / divisor;
    const averageTicket = rawOrders > 0 ? rawSales / rawOrders : 0;
    const percentageOfSales =
      totalPeriodSales > 0 ? (rawSales / totalPeriodSales) * 100 : 0;
    const percentageOfOrders =
      totalPeriodOrders > 0 ? (rawOrders / totalPeriodOrders) * 100 : 0;

    const isPeakSales = maxSalesHour === h && rawSales > 0;
    const isPeakOrders = maxOrdersHour === h && rawOrders > 0;
    // High activity: al menos 65% de la hora pico de ventas
    const isHighActivity =
      maxSales > 0 && rawSales >= maxSales * 0.65 && rawSales > 0;

    allRows.push({
      hour: h,
      hourLabel: formatHourLabel(h),
      displayHour: `${h}:00`,
      sales: Number(sales.toFixed(2)),
      orders: Number(orders.toFixed(mode === "average" ? 1 : 0)),
      rawSales: Number(rawSales.toFixed(2)),
      rawOrders,
      averageTicket: Number(averageTicket.toFixed(2)),
      percentageOfSales: Number(percentageOfSales.toFixed(1)),
      percentageOfOrders: Number(percentageOfOrders.toFixed(1)),
      isPeakSales,
      isPeakOrders,
      isHighActivity,
    });
  }

  // Filtrado de horas activas si se solicita
  const rows = onlyActiveHours
    ? allRows.filter((r) => r.rawOrders > 0 || r.rawSales > 0)
    : allRows;

  // Heatmap Cells
  let maxHeatmapSales = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const val = heatmapRaw[d][h].sales;
      if (val > maxHeatmapSales) maxHeatmapSales = val;
    }
  }

  const heatmapCells: HeatmapCell[] = [];
  DAYS_OF_WEEK.forEach((day) => {
    for (let h = 0; h < 24; h++) {
      const cellData = heatmapRaw[day.index][h];
      const intensity =
        maxHeatmapSales > 0 ? cellData.sales / maxHeatmapSales : 0;
      heatmapCells.push({
        dayIndex: day.index,
        dayName: day.name,
        dayShort: day.short,
        hour: h,
        hourLabel: formatHourLabel(h),
        sales: Number((cellData.sales / divisor).toFixed(2)),
        orders: Number((cellData.orders / divisor).toFixed(mode === "average" ? 1 : 0)),
        intensity: Number(intensity.toFixed(3)),
      });
    }
  });

  const peakHoursSummary: PeakHoursSummary = {
    peakSalesHour:
      maxSalesHour >= 0 && maxSales > 0
        ? {
            hour: maxSalesHour,
            label: formatHourLabel(maxSalesHour),
            amount: Number((maxSales / divisor).toFixed(2)),
            percentage: Number(
              ((maxSales / (totalPeriodSales || 1)) * 100).toFixed(1),
            ),
          }
        : null,
    peakOrdersHour:
      maxOrdersHour >= 0 && maxOrders > 0
        ? {
            hour: maxOrdersHour,
            label: formatHourLabel(maxOrdersHour),
            count: Number((maxOrders / divisor).toFixed(mode === "average" ? 1 : 0)),
            percentage: Number(
              ((maxOrders / (totalPeriodOrders || 1)) * 100).toFixed(1),
            ),
          }
        : null,
    peakTicketHour:
      maxTicketHour >= 0 && maxTicket > 0
        ? {
            hour: maxTicketHour,
            label: formatHourLabel(maxTicketHour),
            averageTicket: Number(maxTicket.toFixed(2)),
            ordersCount: rawHourlyOrders[maxTicketHour],
          }
        : null,
    rushWindow: bestRushWindow
      ? {
          startHour: bestRushWindow.startHour,
          endHour: bestRushWindow.endHour,
          label: `${formatHourLabel(bestRushWindow.startHour)} - ${formatHourLabel(bestRushWindow.endHour)}`,
          sales: Number(bestRushWindow.sales.toFixed(2)),
          orders: Number(bestRushWindow.orders.toFixed(mode === "average" ? 1 : 0)),
          percentage: Number(
            (
              ((bestRushWindow.sales * divisor) / (totalPeriodSales || 1)) *
              100
            ).toFixed(1),
          ),
        }
      : null,
    activeHoursCount,
    totalPeriodSales: Number(totalPeriodSales.toFixed(2)),
    totalPeriodOrders,
    daysInPeriod,
  };

  return {
    rows,
    allRows,
    heatmapCells,
    peakHoursSummary,
    divisor,
    mode,
  };
}

export function transformHourlyRowsToExportItems(
  rows: HourlySalesRow[],
): HourlySaleExportItem[] {
  return rows.map((r) => {
    let peakIndicator = "Normal";
    if (r.isPeakSales && r.isPeakOrders) {
      peakIndicator = "Pico Ventas & Pedidos 🔥⚡";
    } else if (r.isPeakSales) {
      peakIndicator = "Pico de Ventas ⚡";
    } else if (r.isPeakOrders) {
      peakIndicator = "Pico de Pedidos 🔥";
    } else if (r.isHighActivity) {
      peakIndicator = "Alta Actividad";
    } else if (r.rawOrders === 0) {
      peakIndicator = "Sin Actividad";
    }

    return {
      hour: formatHourRangeLabel(r.hour),
      sales: r.sales,
      percentage: r.percentageOfSales,
      orders: r.orders,
      averageTicket: r.averageTicket,
      peakIndicator,
    };
  });
}

export const HOURLY_SALES_EXPORT_COLUMNS: ExportColumn<HourlySaleExportItem>[] = [
  { header: "Rango Horario", key: "hour" },
  {
    header: "Ventas",
    accessor: (item) => `$${item.sales.toFixed(2)}`,
  },
  {
    header: "% del Total",
    accessor: (item) => `${item.percentage.toFixed(1)}%`,
  },
  { header: "Pedidos", key: "orders" },
  {
    header: "Ticket Promedio",
    accessor: (item) => `$${item.averageTicket.toFixed(2)}`,
  },
  { header: "Indicador", key: "peakIndicator" },
];

import { MEX_TIMEZONE } from "@/lib/utils";

export type ReportPeriod =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "month"
  | "last_month"
  | "custom"
  | string;

export interface RawReportOrder {
  id: string;
  total: number | null;
  created_at: string;
  completed_at: string | null;
  source: string | null;
  status: string;
  order_items?: Array<{
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    menu_items?:
      | {
          name: string;
          category?: string | null;
        }
      | Array<{
          name: string;
          category?: string | null;
        }>
      | null;
  }> | null;
}

export interface RawCustomer {
  id: string;
  name?: string | null;
  total_spend?: number | null;
  loyalty_points?: number | null;
}

export function getMexicoDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MEX_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function calculateReportDates(
  period: ReportPeriod,
  customStart?: string | null,
  customEnd?: string | null,
  baseDate: Date = new Date(),
) {
  const mxTodayStr = getMexicoDateStr(baseDate);
  let startDate: Date;
  let endDate: Date | null = null;

  if (period === "today") {
    startDate = new Date(`${mxTodayStr}T00:00:00-06:00`);
    endDate = new Date(`${mxTodayStr}T23:59:59.999-06:00`);
  } else if (period === "yesterday") {
    const yesterdayDate = new Date(baseDate);
    yesterdayDate.setDate(baseDate.getDate() - 1);
    const mxYesterdayStr = getMexicoDateStr(yesterdayDate);
    startDate = new Date(`${mxYesterdayStr}T00:00:00-06:00`);
    endDate = new Date(`${mxYesterdayStr}T23:59:59.999-06:00`);
  } else if (period === "30days") {
    const start30 = new Date(baseDate);
    start30.setDate(baseDate.getDate() - 29);
    const mx30Str = getMexicoDateStr(start30);
    startDate = new Date(`${mx30Str}T00:00:00-06:00`);
    endDate = new Date(`${mxTodayStr}T23:59:59.999-06:00`);
  } else if (period === "month") {
    const [year, month] = mxTodayStr.split("-");
    startDate = new Date(`${year}-${month}-01T00:00:00-06:00`);
    endDate = new Date(`${mxTodayStr}T23:59:59.999-06:00`);
  } else if (period === "last_month") {
    const [yearStr, monthStr] = mxTodayStr.split("-");
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    const prevMonthStr = String(month).padStart(2, "0");
    startDate = new Date(`${year}-${prevMonthStr}-01T00:00:00-06:00`);
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate();
    endDate = new Date(
      `${year}-${prevMonthStr}-${String(lastDayOfPrevMonth).padStart(2, "0")}T23:59:59.999-06:00`,
    );
  } else if (period === "custom" && customStart) {
    startDate = new Date(`${customStart}T00:00:00-06:00`);
    if (customEnd) {
      endDate = new Date(`${customEnd}T23:59:59.999-06:00`);
    }
  } else {
    // Default: last 7 days
    const start7 = new Date(baseDate);
    start7.setDate(baseDate.getDate() - 6);
    const mx7Str = getMexicoDateStr(start7);
    startDate = new Date(`${mx7Str}T00:00:00-06:00`);
    endDate = new Date(`${mxTodayStr}T23:59:59.999-06:00`);
  }

  return {
    startDate,
    endDate,
    startIsoDate: getMexicoDateStr(startDate),
    endIsoDate: endDate ? getMexicoDateStr(endDate) : null,
  };
}

export function transformTopCustomers(customers: RawCustomer[] | null | undefined) {
  return (customers || []).map((c) => ({
    id: c.id,
    name: c.name?.trim() || "Cliente",
    totalSpend: Number(c.total_spend || 0),
    loyaltyPoints: Number(c.loyalty_points || 0),
  }));
}

export function aggregateSalesData(orders: RawReportOrder[] | null | undefined) {
  const typedOrders = orders || [];

  let totalCompletionTimeMs = 0;
  let completedOrdersCount = 0;

  const totalSales = typedOrders.reduce((sum, order) => {
    if (order.created_at && order.completed_at) {
      const created = new Date(order.created_at).getTime();
      const completed = new Date(order.completed_at).getTime();
      if (completed >= created && !isNaN(created) && !isNaN(completed)) {
        totalCompletionTimeMs += completed - created;
        completedOrdersCount++;
      }
    }
    return sum + Number(order.total || 0);
  }, 0);

  const totalOrders = typedOrders.length;
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
  const averageCompletionTimeMinutes =
    completedOrdersCount > 0
      ? totalCompletionTimeMs / completedOrdersCount / (1000 * 60)
      : 0;

  const salesByDay: Record<string, number> = {};
  const itemsByDay: Record<
    string,
    Record<string, { name: string; quantity: number; revenue: number }>
  > = {};
  const salesBySource: Record<string, { count: number; total: number }> = {};
  const itemSales: Record<
    string,
    {
      id: string;
      name: string;
      category: string;
      quantity: number;
      revenue: number;
    }
  > = {};
  const categorySet = new Set<string>();

  typedOrders.forEach((order) => {
    if (!order.created_at) return;
    const date = getMexicoDateStr(new Date(order.created_at));
    salesByDay[date] = (salesByDay[date] || 0) + Number(order.total || 0);

    const source = order.source || "Desconocido";
    if (!salesBySource[source]) {
      salesBySource[source] = { count: 0, total: 0 };
    }
    salesBySource[source].count += 1;
    salesBySource[source].total += Number(order.total || 0);

    if (!itemsByDay[date]) itemsByDay[date] = {};
    const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

    orderItems.forEach((item) => {
      if (!item || !item.menu_item_id) return;
      const key = item.menu_item_id;
      const rawMenuItem = Array.isArray(item.menu_items)
        ? item.menu_items[0]
        : item.menu_items;
      const itemName = rawMenuItem?.name || "Producto";
      const cat = rawMenuItem?.category || "General";
      categorySet.add(cat);

      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);

      // By Day
      if (!itemsByDay[date][key]) {
        itemsByDay[date][key] = {
          name: itemName,
          quantity: 0,
          revenue: 0,
        };
      }
      itemsByDay[date][key].quantity += quantity;
      itemsByDay[date][key].revenue += quantity * unitPrice;

      // Overall
      if (!itemSales[key]) {
        itemSales[key] = {
          id: key,
          name: itemName,
          category: cat,
          quantity: 0,
          revenue: 0,
        };
      }
      itemSales[key].quantity += quantity;
      itemSales[key].revenue += quantity * unitPrice;
    });
  });

  const itemsByDaySorted: Record<
    string,
    { name: string; quantity: number; revenue: number }[]
  > = {};
  Object.entries(itemsByDay).forEach(([date, items]) => {
    itemsByDaySorted[date] = Object.values(items)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  });

  const productSales = Object.values(itemSales).sort(
    (a, b) => b.revenue - a.revenue,
  );

  const topSellingItems = [...productSales]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const categories = Array.from(categorySet);

  return {
    totalSales,
    totalOrders,
    averageTicket,
    averageCompletionTimeMinutes,
    salesByDay,
    itemsByDay: itemsByDaySorted,
    salesBySource,
    productSales,
    topSellingItems,
    categories,
  };
}

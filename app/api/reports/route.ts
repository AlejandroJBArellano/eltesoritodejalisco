import { createClient } from "@/lib/supabase/server";
import { MEX_TIMEZONE } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7days"; // today | 7days | month

    const today = new Date();
    let startDate: Date;

    if (period === "today") {
      // Start of today in Mexico City time
      const mxDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: MEX_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(today);
      startDate = new Date(`${mxDateStr}T00:00:00-06:00`);
    } else if (period === "month") {
      // Start of current month in Mexico City time
      const mxDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: MEX_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(today);
      const [year, month] = mxDateStr.split("-");
      startDate = new Date(`${year}-${month}-01T00:00:00-06:00`);
    } else {
      // Default: last 7 days
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
    }

    

    const supabase = await createClient();

    // 1. Sales Summary (Completed Orders)
    const { data: completedOrders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        )
      `)
      .in("status", ["DELIVERED", "PAID"])
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (ordersError) throw ordersError;

    // Calculate totals
    let totalCompletionTimeMs = 0;
    let completedOrdersCount = 0;

    const totalSales = (completedOrders || []).reduce(
      (sum, order) => {
        if (order.created_at && order.completed_at) {
          const created = new Date(order.created_at).getTime();
          const completed = new Date(order.completed_at).getTime();
          if (completed >= created) {
            totalCompletionTimeMs += (completed - created);
            completedOrdersCount++;
          }
        }
        return sum + (order.total || 0);
      },
      0,
    );
    const totalOrders = (completedOrders || []).length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const averageCompletionTimeMinutes = completedOrdersCount > 0 ? (totalCompletionTimeMs / completedOrdersCount) / (1000 * 60) : 0;

    const { data: payments } = await supabase
      .from("payments")
      .select("tip_amount")
      .gte("created_at", startDate.toISOString());

    const totalTips = (payments || []).reduce(
      (sum, p) => sum + (p.tip_amount || 0),
      0
    );

    // Sales by Day
    const salesByDay: Record<string, number> = {};
    // Items by Day for interactive drill-down
    const itemsByDay: Record<string, Record<string, { name: string; quantity: number; revenue: number }>> = {};

    (completedOrders || []).forEach((order) => {
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: MEX_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(order.created_at));
      salesByDay[date] = (salesByDay[date] || 0) + (order.total || 0);

      // Track items per day
      if (!itemsByDay[date]) itemsByDay[date] = {};
      (order as any).order_items.forEach((item: any) => {
        const key = item.menu_item_id;
        if (!itemsByDay[date][key]) {
          itemsByDay[date][key] = {
            name: item.menu_items?.name || "Unknown",
            quantity: 0,
            revenue: 0,
          };
        }
        itemsByDay[date][key].quantity += item.quantity;
        itemsByDay[date][key].revenue += item.quantity * item.unit_price;
      });
    });

    // Convert itemsByDay values to sorted arrays
    const itemsByDaySorted: Record<string, { name: string; quantity: number; revenue: number }[]> = {};
    Object.entries(itemsByDay).forEach(([date, items]) => {
      itemsByDaySorted[date] = Object.values(items)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    });

    // Sales by Source
    const salesBySource: Record<string, { count: number; total: number }> = {};
    (completedOrders || []).forEach((order) => {
      const source = order.source || "Desconocido";
      if (!salesBySource[source]) {
        salesBySource[source] = { count: 0, total: 0 };
      }
      salesBySource[source].count += 1;
      salesBySource[source].total += (order.total || 0);
    });

    // 2. Top Selling Items (aggregate across the period)
    const itemSales: Record<string, { name: string; quantity: number; revenue: number }> =
      {};
    (completedOrders || []).forEach((order) => {
      (order as any).order_items.forEach((item: any) => {
        if (!itemSales[item.menu_item_id]) {
          itemSales[item.menu_item_id] = {
            name: item.menu_items?.name || "Unknown",
            quantity: 0,
            revenue: 0,
          };
        }
        itemSales[item.menu_item_id].quantity += item.quantity;
        itemSales[item.menu_item_id].revenue += item.quantity * item.unit_price;
      });
    });

    const topSellingItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);



    // 4. Customer Insights
    const { data: customers, error: custError } = await supabase
      .from("customers")
      .select("*")
      .order("total_spend", { ascending: false })
      .limit(5);

    if (custError) throw custError;

    const { count: newCustomersCount, error: countError } = await supabase
      .from("customers")
      .select("*", { count: 'exact', head: true })
      .gte("created_at", startDate.toISOString());

    if (countError) throw countError;

    // 5. Gastos Operativos
    const { data: expensesData, error: expError } = await supabase
      .from("expenses")
      .select("amount")
      .gte("date", startDate.toISOString().split("T")[0]);

    if (expError) throw expError;

    const totalExpenses = (expensesData || []).reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    );

    // 6. Pérdidas por Cobro (Uncollected Orders)
    const { data: uncollectedOrders } = await supabase
      .from("orders")
      .select("total")
      .eq("status", "UNCOLLECTED")
      .gte("created_at", startDate.toISOString());

    const totalUncollected = (uncollectedOrders || []).reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );

    return NextResponse.json({
      period,
      summary: {
        totalSales,
        totalOrders,
        averageTicket,
        totalTips,
        averageCompletionTimeMinutes,
        totalExpenses,
        totalUncollected,
      },
      salesByDay,
      itemsByDay: itemsByDaySorted,
      salesBySource,
      topSellingItems,
      customers: {
        topCustomers: customers,
        newCustomersCount: newCustomersCount || 0
      }
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { error: "Error al generar reportes" },
      { status: 500 },
    );
  }
}

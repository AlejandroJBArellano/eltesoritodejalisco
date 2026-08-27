import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import {
  calculateReportDates,
  transformTopCustomers,
  aggregateSalesData,
  RawReportOrder,
  RawCustomer,
} from "@/lib/services/reports";

export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7days"; // today | yesterday | 7days | 30days | month | last_month | custom
    const customStartParam = searchParams.get("startDate");
    const customEndParam = searchParams.get("endDate");

    const { startDate, endDate, startIsoDate, endIsoDate } = calculateReportDates(
      period,
      customStartParam,
      customEndParam,
    );

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // 1. Sales Summary (Completed Orders)
    let ordersQuery = supabase
      .from("orders")
      .select(
        `
        id,
        total,
        created_at,
        completed_at,
        source,
        status,
        order_items (
          menu_item_id,
          quantity,
          unit_price,
          menu_items (
            name,
            category
          )
        )
      `,
      )
      .eq("tenant_id", tenant.id)
      .in("status", ["DELIVERED", "PAID"])
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (endDate) {
      ordersQuery = ordersQuery.lte("created_at", endDate.toISOString());
    }

    const { data: completedOrders, error: ordersError } = await ordersQuery;
    if (ordersError) {
      console.error("Error fetching orders in reports:", ordersError);
      throw ordersError;
    }

    const salesMetrics = aggregateSalesData(
      completedOrders as unknown as RawReportOrder[],
    );

    // 2. Propinas Totales (Payments)
    let paymentsQuery = supabase
      .from("payments")
      .select("tip_amount")
      .eq("tenant_id", tenant.id)
      .gte("created_at", startDate.toISOString());
    if (endDate) {
      paymentsQuery = paymentsQuery.lte("created_at", endDate.toISOString());
    }
    const { data: payments, error: paymentsError } = await paymentsQuery;
    if (paymentsError) {
      console.error("Error fetching payments in reports:", paymentsError);
    }

    const totalTips = (payments || []).reduce(
      (sum, p) => sum + Number(p.tip_amount || 0),
      0,
    );

    // 3. Customer Insights
    const { data: customers, error: custError } = await supabase
      .from("customers")
      .select("id, name, total_spend, loyalty_points")
      .eq("tenant_id", tenant.id)
      .order("total_spend", { ascending: false })
      .limit(5);

    if (custError) {
      console.error("Error fetching customers in reports:", custError);
      throw custError;
    }

    const topCustomers = transformTopCustomers(
      customers as unknown as RawCustomer[],
    );

    let newCustQuery = supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .gte("created_at", startDate.toISOString());
    if (endDate) {
      newCustQuery = newCustQuery.lte("created_at", endDate.toISOString());
    }
    const { count: newCustomersCount, error: countError } = await newCustQuery;

    if (countError) {
      console.error("Error counting new customers in reports:", countError);
    }

    // 4. Gastos Operativos
    let expensesQuery = supabase
      .from("expenses")
      .select("amount")
      .eq("tenant_id", tenant.id)
      .gte("date", startIsoDate);
    if (endIsoDate) {
      expensesQuery = expensesQuery.lte("date", endIsoDate);
    }
    const { data: expensesData, error: expError } = await expensesQuery;

    if (expError) {
      console.error("Error fetching expenses in reports:", expError);
      throw expError;
    }

    const totalExpenses = (expensesData || []).reduce(
      (sum, exp) => sum + Number(exp.amount || 0),
      0,
    );

    // 5. Pérdidas por Cobro (Uncollected Orders)
    let uncollectedQuery = supabase
      .from("orders")
      .select("total")
      .eq("status", "UNCOLLECTED")
      .eq("tenant_id", tenant.id)
      .gte("created_at", startDate.toISOString());
    if (endDate) {
      uncollectedQuery = uncollectedQuery.lte(
        "created_at",
        endDate.toISOString(),
      );
    }
    const { data: uncollectedOrders, error: uncollError } = await uncollectedQuery;
    if (uncollError) {
      console.error("Error fetching uncollected orders in reports:", uncollError);
    }

    const totalUncollected = (uncollectedOrders || []).reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    return NextResponse.json({
      period,
      summary: {
        totalSales: salesMetrics.totalSales,
        totalOrders: salesMetrics.totalOrders,
        averageTicket: salesMetrics.averageTicket,
        totalTips,
        averageCompletionTimeMinutes: salesMetrics.averageCompletionTimeMinutes,
        totalExpenses,
        totalUncollected,
      },
      salesByDay: salesMetrics.salesByDay,
      itemsByDay: salesMetrics.itemsByDay,
      salesBySource: salesMetrics.salesBySource,
      topSellingItems: salesMetrics.topSellingItems,
      productSales: salesMetrics.productSales,
      categories: salesMetrics.categories,
      customers: {
        topCustomers,
        newCustomersCount: newCustomersCount || 0,
      },
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar reportes" },
      { status: 500 },
    );
  }
}

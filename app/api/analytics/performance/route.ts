import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { calculateReportDates, RawReportOrder } from "@/lib/services/reports";
import { aggregatePerformanceData } from "@/lib/services/performanceAnalytics";

export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7days";
    const customStartParam = searchParams.get("startDate");
    const customEndParam = searchParams.get("endDate");

    const { startDate, endDate, startIsoDate, endIsoDate } = calculateReportDates(
      period,
      customStartParam,
      customEndParam,
    );

    const tenant = await getTenantContext();
    const supabase = await createClient();

    // 1. Pedidos para el período seleccionado
    let periodQuery = supabase
      .from("orders")
      .select(
        `
        id,
        total,
        created_at,
        completed_at,
        source,
        status
      `,
      )
      .eq("tenant_id", tenant.id)
      .in("status", ["DELIVERED", "PAID"])
      .gte("created_at", startDate.toISOString());

    if (endDate) {
      periodQuery = periodQuery.lte("created_at", endDate.toISOString());
    }

    const { data: periodOrders, error: periodError } = await periodQuery.order(
      "created_at",
      { ascending: true },
    );
    if (periodError) {
      console.error("Error fetching period orders in performance analytics:", periodError);
      throw periodError;
    }

    // 2. Pedidos de los últimos 12 meses para la comparativa mensual continua
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const { data: historicalOrders, error: historyError } = await supabase
      .from("orders")
      .select(
        `
        id,
        total,
        created_at,
        completed_at,
        source,
        status
      `,
      )
      .eq("tenant_id", tenant.id)
      .in("status", ["DELIVERED", "PAID"])
      .gte("created_at", twelveMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("Error fetching historical orders in performance analytics:", historyError);
      throw historyError;
    }

    const performanceResult = aggregatePerformanceData(
      periodOrders as unknown as RawReportOrder[],
      historicalOrders as unknown as RawReportOrder[],
      now,
    );

    return NextResponse.json({
      period,
      startIsoDate,
      endIsoDate,
      ...performanceResult,
    });
  } catch (error) {
    console.error("Error in performance analytics API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al generar analítica de rendimiento" },
      { status: 500 },
    );
  }
}

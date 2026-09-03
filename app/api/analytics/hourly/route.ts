import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { calculateReportDates, RawReportOrder } from "@/lib/services/reports";
import {
  aggregateHourlySales,
  HourlyAggregationMode,
} from "@/lib/services/hourlyAnalytics";

export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const customStartParam = searchParams.get("startDate");
    const customEndParam = searchParams.get("endDate");
    const mode = (searchParams.get("mode") || "sum") as HourlyAggregationMode;
    const onlyActiveHours = searchParams.get("onlyActiveHours") === "true";

    const { startDate, endDate, startIsoDate, endIsoDate } = calculateReportDates(
      period,
      customStartParam,
      customEndParam,
    );

    const tenant = await getTenantContext();
    const supabase = await createClient();

    let ordersQuery = supabase
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
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (endDate) {
      ordersQuery = ordersQuery.lte("created_at", endDate.toISOString());
    }

    const { data: completedOrders, error: ordersError } = await ordersQuery;
    if (ordersError) {
      console.error("Error fetching orders for hourly analytics:", ordersError);
      throw ordersError;
    }

    const result = aggregateHourlySales(
      completedOrders as unknown as RawReportOrder[],
      {
        mode,
        onlyActiveHours,
      },
    );

    return NextResponse.json({
      period,
      startIsoDate,
      endIsoDate,
      ...result,
    });
  } catch (error) {
    console.error("Error in hourly analytics API:", error);
    return NextResponse.json(
      { error: "Error al generar reporte de horas pico" },
      { status: 500 },
    );
  }
}

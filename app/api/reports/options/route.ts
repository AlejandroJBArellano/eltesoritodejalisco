// GET /api/reports/options — ventas por opción de personalización.
// Mismo periodo y permisos que /api/reports.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { calculateReportDates } from "@/lib/services/reports";
import {
  aggregateOptionSales,
  type RawOptionReportOrder,
} from "@/lib/services/optionReports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7days";
    const { startDate, endDate } = calculateReportDates(
      period,
      searchParams.get("startDate"),
      searchParams.get("endDate"),
    );

    const tenant = await getTenantContext();
    const supabase = await createClient();

    let query = supabase
      .from("orders")
      .select(
        `
        id,
        source,
        order_items (
          menu_item_id,
          quantity,
          menu_items ( name ),
          order_item_options ( option_id, group_name, option_name, quantity, unit_price )
        )
      `,
      )
      .eq("tenant_id", tenant.id)
      .in("status", ["DELIVERED", "PAID"])
      .gte("created_at", startDate.toISOString());
    if (endDate) query = query.lte("created_at", endDate.toISOString());

    const { data, error } = await query;
    if (error) {
      // Migración pendiente ⇒ sin datos de personalización
      const code = (error as { code?: string }).code;
      if (code === "PGRST200" || code === "42P01") {
        return NextResponse.json({ rows: [] });
      }
      throw error;
    }

    return NextResponse.json({
      rows: aggregateOptionSales((data || []) as unknown as RawOptionReportOrder[]),
    });
  } catch (error) {
    console.error("Error fetching option sales report:", error);
    return NextResponse.json(
      { error: "No se pudo generar el reporte de opciones" },
      { status: 500 },
    );
  }
}

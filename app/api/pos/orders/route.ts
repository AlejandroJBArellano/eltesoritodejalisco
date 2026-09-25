import { createClient } from "@/lib/supabase/server";
import { getCurrentCDMXDay } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";

/**
 * GET /api/pos/orders
 * Dedicated POS orders endpoint with server-side pagination, active shift filtering (after latest cash cut),
 * and shift aggregates for UI tabs and live stats.
 */
export async function GET(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("pageSize") || "10", 10) || 10),
    );
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();
    const sourceFilter = (searchParams.get("source") || "ALL").toUpperCase();

    // 1. Obtener el corte de caja más reciente del restaurante
    const { data: latestCut } = await supabase
      .from("daily_cuts")
      .select("id, created_at, cut_date")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestCutCreatedAt = latestCut?.created_at || null;
    const today = getCurrentCDMXDay();

    // 2. Obtener resumen de todas las órdenes del turno activo para contadores y métricas globales
    let summaryQuery = supabase
      .from("orders")
      .select("id, status, source, total")
      .eq("tenant_id", tenant.id);

    if (latestCutCreatedAt) {
      summaryQuery = summaryQuery.gt("created_at", latestCutCreatedAt);
    } else {
      summaryQuery = summaryQuery.eq("operational_date", today);
    }

    const { data: shiftOrdersSummary, error: summaryError } = await summaryQuery;
    if (summaryError) throw summaryError;

    let pendingCount = 0;
    let paidCount = 0;
    let posCount = 0;
    let pickupCount = 0;
    let salesTotal = 0;
    let paidSalesCount = 0;

    for (const o of shiftOrdersSummary || []) {
      if (o.status === "PAID") {
        paidCount++;
        salesTotal += Number(o.total || 0);
        paidSalesCount++;
      } else if (o.status === "DELIVERED") {
        salesTotal += Number(o.total || 0);
        paidSalesCount++;
      } else {
        pendingCount++;
      }

      if (o.source === "PICKUP_APP") {
        pickupCount++;
      } else {
        posCount++;
      }
    }

    const totalShiftOrders = shiftOrdersSummary?.length ?? 0;
    const avgTicket = paidSalesCount > 0 ? salesTotal / paidSalesCount : 0;

    // 3. Consulta paginada con los campos requeridos por el POS
    const selectFields = `
      id, order_number, customer_id, source, status, table, notes,
      subtotal, tax, total, created_at, updated_at, completed_at,
      corte_id, estado_cierre, operational_date, pickup_time,
      order_items (
        id, order_id, menu_item_id, quantity, unit_price, notes, status,
        tiempo_preparacion_segundos, created_at,
        menu_items ( id, name, price, image_url, is_available )
      ),
      payments ( id, order_id, method, amount, received_amount, change, tip_amount, created_at ),
      customer:customers ( id, name, email, phone )
    `;

    let pagedQuery = supabase
      .from("orders")
      .select(selectFields, { count: "exact" })
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (latestCutCreatedAt) {
      pagedQuery = pagedQuery.gt("created_at", latestCutCreatedAt);
    } else {
      pagedQuery = pagedQuery.eq("operational_date", today);
    }

    if (statusFilter === "PENDING") {
      pagedQuery = pagedQuery.neq("status", "PAID");
    } else if (statusFilter === "PAID") {
      pagedQuery = pagedQuery.eq("status", "PAID");
    }

    if (sourceFilter === "POS") {
      pagedQuery = pagedQuery.neq("source", "PICKUP_APP");
    } else if (sourceFilter === "PICKUP_APP") {
      pagedQuery = pagedQuery.eq("source", "PICKUP_APP");
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    pagedQuery = pagedQuery.range(start, end);

    const { data: pagedOrders, count: filteredCount, error: pagedError } =
      await pagedQuery;

    if (pagedError) throw pagedError;

    const totalFiltered = filteredCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

    return NextResponse.json({
      orders: pagedOrders || [],
      pagination: {
        page,
        pageSize,
        total: totalFiltered,
        totalPages,
      },
      counts: {
        total: totalShiftOrders,
        pending: pendingCount,
        paid: paidCount,
        pos: posCount,
        pickup: pickupCount,
      },
      stats: {
        count: totalShiftOrders,
        sales: salesTotal,
        avgTicket,
      },
    });
  } catch (error) {
    console.error("[POS Orders API] Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes del POS" },
      { status: 500 },
    );
  }
}

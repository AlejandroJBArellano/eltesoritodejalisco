import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]/audit
 * Retorna la cronología completa de auditoría de una orden específica scoped al tenant actual.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenant = await getTenantContext();
    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from("order_audit_logs")
      .select("*")
      .eq("order_id", id)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[ORDER_AUDIT_API] Error querying audit logs:", error);
      return NextResponse.json(
        { error: "Error al obtener el historial de modificaciones" },
        { status: 500 },
      );
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error("[ORDER_AUDIT_API] Exception fetching audit logs:", error);
    return NextResponse.json(
      { error: "Error al obtener el historial de modificaciones" },
      { status: 500 },
    );
  }
}

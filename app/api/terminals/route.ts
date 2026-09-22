import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

/**
 * GET /api/terminals
 * Obtener las terminales bancarias activas del tenant actual para el POS
 */
export async function GET() {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();

    const { data: terminals, error } = await supabase
      .from("payment_terminals")
      .select("id, name, short_name, commission_rate, is_default, is_active")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ terminals: terminals || [] });
  } catch (error) {
    console.error("Error fetching active terminals:", error);
    return NextResponse.json(
      { error: "Error al obtener las terminales bancarias" },
      { status: 500 },
    );
  }
}

import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * GET /api/admin/terminals
 * Obtener todas las terminales bancarias del tenant
 */
export async function GET() {
  try {
    const tenant = await getTenantContext();
    const supabase = createAdminClient();

    const { data: terminals, error } = await supabase
      .from("payment_terminals")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ terminals: terminals || [] });
  } catch (error) {
    console.error("Error fetching payment terminals:", error);
    return NextResponse.json(
      { error: "Error al obtener las terminales bancarias" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/terminals
 * Crear una nueva terminal bancaria
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    const canManage =
      profile &&
      (profile.role === "ADMIN" ||
        profile.role === "MANAGER" ||
        hasPermission(profile, "settings.manage_restaurant"));

    if (!canManage) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = await getTenantContext();
    const body = await request.json();
    const { name, short_name, commission_rate, is_default = false } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre de la terminal es obligatorio" },
        { status: 400 },
      );
    }

    const shortName = (short_name && short_name.trim()) || name.trim();
    const parsedRate = parseFloat(commission_rate);
    const commissionRate = Number.isFinite(parsedRate)
      ? Math.max(0, Math.min(100, parsedRate))
      : 0;

    const supabase = createAdminClient();

    // Comprobar si ya existen terminales para asignar is_default si es la primera
    const { count: existingCount } = await supabase
      .from("payment_terminals")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id);

    const shouldBeDefault = is_default || (existingCount ?? 0) === 0;

    if (shouldBeDefault) {
      await supabase
        .from("payment_terminals")
        .update({ is_default: false })
        .eq("tenant_id", tenant.id);
    }

    const { data: terminal, error } = await supabase
      .from("payment_terminals")
      .insert({
        tenant_id: tenant.id,
        name: name.trim(),
        short_name: shortName,
        commission_rate: commissionRate,
        is_default: shouldBeDefault,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ terminal }, { status: 201 });
  } catch (error) {
    console.error("Error creating payment terminal:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al crear la terminal bancaria",
      },
      { status: 500 },
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext, invalidateTenantCache } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const role = profile?.role || dbUser?.role || (user.user_metadata?.role as string);
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Permisos insuficientes para modificar configuración" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const tolerance = Number(body.attendance_tolerance_minutes);

    if (isNaN(tolerance) || tolerance < 0) {
      return NextResponse.json(
        { error: "El margen de tolerancia debe ser un número mayor o igual a 0" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase
      .from("tenants")
      .update({ attendance_tolerance_minutes: tolerance })
      .eq("id", tenant.id);

    if (updateError) {
      console.error("Error updating attendance tolerance:", updateError);
      return NextResponse.json({ error: "Error al guardar tolerancia" }, { status: 500 });
    }

    invalidateTenantCache(tenant.slug);

    return NextResponse.json({
      success: true,
      attendance_tolerance_minutes: tolerance,
    });
  } catch (error) {
    console.error("PUT /api/shifts/settings error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

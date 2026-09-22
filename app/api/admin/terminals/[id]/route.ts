import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * PATCH /api/admin/terminals/[id]
 * Actualizar una terminal existente o alternar su estado / default
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
    const { name, short_name, commission_rate, is_default, is_active } = body;

    const supabase = createAdminClient();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updatePayload.name = name.trim();
    if (short_name !== undefined)
      updatePayload.short_name = short_name.trim() || name?.trim();
    if (commission_rate !== undefined) {
      const parsedRate = parseFloat(commission_rate);
      updatePayload.commission_rate = Number.isFinite(parsedRate)
        ? Math.max(0, Math.min(100, parsedRate))
        : 0;
    }
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    if (is_default === true) {
      // Si se marca como default, desmarcar las demás del tenant
      await supabase
        .from("payment_terminals")
        .update({ is_default: false })
        .eq("tenant_id", tenant.id);
      updatePayload.is_default = true;
      updatePayload.is_active = true; // La predeterminada siempre debe estar activa
    } else if (is_default === false) {
      updatePayload.is_default = false;
    }

    const { data: terminal, error } = await supabase
      .from("payment_terminals")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ terminal });
  } catch (error) {
    console.error("Error updating payment terminal:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar la terminal",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/terminals/[id]
 * Desactivar o eliminar una terminal bancaria
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
    const supabase = createAdminClient();

    // Comprobar si existen pagos históricos asociados a esta terminal
    const { count: paymentsCount } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("terminal_id", id)
      .eq("tenant_id", tenant.id);

    if (paymentsCount && paymentsCount > 0) {
      // Soft delete: desactivar para mantener integridad referencial histórica
      const { error: softDeleteError } = await supabase
        .from("payment_terminals")
        .update({
          is_active: false,
          is_default: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenant.id);

      if (softDeleteError) throw softDeleteError;

      return NextResponse.json({
        success: true,
        message: "Terminal desactivada para preservar los registros de pagos pasados.",
        softDeleted: true,
      });
    }

    // Hard delete si no tiene pagos asociados
    const { error: deleteError } = await supabase
      .from("payment_terminals")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, softDeleted: false });
  } catch (error) {
    console.error("Error deleting payment terminal:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al eliminar la terminal bancaria",
      },
      { status: 500 },
    );
  }
}

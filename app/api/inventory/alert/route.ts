// KittnOS - Stock Alert Email & Push API
// POST /api/inventory/alert — Sends low-stock email & push alerts

import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant";
import { sendLowStockAlertEmail } from "@/lib/services/email";
import { sendTenantPushNotification } from "@/lib/services/push";

/**
 * POST /api/inventory/alert
 * Sends a low-stock email & push alert for all ingredients below minimum stock.
 * Can be called manually (from the inventory page button) or programmatically.
 */
export async function POST(request: NextRequest) {
  try {
    const internalSecret = request.headers.get("x-internal-secret");
    const isInternal =
      internalSecret &&
      internalSecret === (process.env.INTERNAL_API_SECRET || "kittnos-internal");

    if (!isInternal) {
      const profile = await getProfile();
      if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    const tenant = await getTenantContext();
    const supabase = isInternal ? createAdminClient() : await createClient();

    // Fetch all low/out-of-stock ingredients
    const { data: ingredients, error } = await supabase
      .from("ingredients")
      .select("id, name, current_stock, minimum_stock, unit")
      .eq("tenant_id", tenant.id)
      .order("current_stock", { ascending: true });

    if (error) throw error;

    const lowStock = (ingredients || []).filter(
      (ing) => ing.current_stock <= ing.minimum_stock,
    );

    if (lowStock.length === 0) {
      return NextResponse.json({
        message: "No hay ingredientes con stock bajo. No se envió alerta.",
        sent: false,
      });
    }

    const outOfStock = lowStock.filter((i) => i.current_stock <= 0);
    const belowMin = lowStock.filter((i) => i.current_stock > 0);

    // 1. Send dynamic branded email
    const emailResult = await sendLowStockAlertEmail({
      tenant,
      lowStock,
      outOfStock,
      belowMin,
    });

    // 2. Trigger web push notification (non-blocking)
    const alertTitle =
      outOfStock.length > 0
        ? `🔴 ${outOfStock.length} ingrediente(s) AGOTADOS`
        : `🟡 ${lowStock.length} ingrediente(s) con stock bajo`;

    const sampleItems = lowStock
      .slice(0, 3)
      .map((i) => i.name)
      .join(", ");

    sendTenantPushNotification(
      tenant.id,
      {
        title: alertTitle,
        body: `Revisa el inventario: ${sampleItems}${lowStock.length > 3 ? "..." : ""}`,
        url: "/inventario",
        tag: `low-stock-${Date.now()}`,
      },
      ["ADMIN", "MANAGER"],
    ).catch((err) => {
      console.error("[Push Notification Error] Failed to send low stock push:", err);
    });

    return NextResponse.json({
      success: emailResult.success,
      sent: emailResult.success,
      emailId: emailResult.emailId,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
    });
  } catch (error) {
    console.error("Stock alert error:", error);
    return NextResponse.json(
      { error: "Error interno al enviar alerta" },
      { status: 500 },
    );
  }
}

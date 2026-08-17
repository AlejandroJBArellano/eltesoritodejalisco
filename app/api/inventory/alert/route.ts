// KittnOS - Stock Alert Email API
// POST /api/inventory/alert — Sends low-stock email alert via Resend

import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant";
import { getTenantAdminEmails, getTenantAdminUrl } from "@/lib/services/email";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ALERT_FROM = "alerts@trykittn.com";

/**
 * POST /api/inventory/alert
 * Sends a low-stock email alert for all ingredients below minimum stock.
 * Can be called manually (from the inventory page button) or programmatically.
 */
export async function POST(request: NextRequest) {
  try {
    const internalSecret = request.headers.get("x-internal-secret");
    const isInternal = internalSecret && internalSecret === (process.env.INTERNAL_API_SECRET || "kittnos-internal");

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
        message: "No hay ingredientes con stock bajo. No se envió email.",
        sent: false,
      });
    }

    const outOfStock = lowStock.filter((i) => i.current_stock <= 0);
    const belowMin = lowStock.filter((i) => i.current_stock > 0);

    const tenantName = tenant.name || tenant.system_name || "KittnOS";
    const inventoryUrl = getTenantAdminUrl(tenant.slug, "/inventario");
    const recipients = await getTenantAdminEmails(tenant.id);

    if (recipients.length === 0) {
      console.warn(
        `[Inventory Alert] No admin emails found for tenant ${tenant.id} (${tenantName}). Skipping email.`,
      );
      return NextResponse.json({
        message: "No hay administradores registrados para recibir alertas.",
        sent: false,
      });
    }

    const now = new Date().toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "full",
      timeStyle: "short",
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alerta de Inventario — ${tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
    <!-- Header -->
    <div style="background:#1f1f1f;border-bottom:1px solid #2a2a2a;padding:24px 28px;display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;background:#ef444420;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">⚠️</div>
      <div>
        <p style="margin:0;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#f87171;">Alerta de Inventario</p>
        <p style="margin:0;font-size:12px;color:#555;font-weight:500;">${tenantName} · ${now}</p>
      </div>
    </div>

    <!-- Summary -->
    <div style="padding:24px 28px 0;">
      <p style="margin:0 0 16px;font-size:14px;color:#888;font-weight:500;">
        Se detectaron <strong style="color:#e5e5e5;">${lowStock.length} ingrediente(s)</strong> con niveles críticos de stock.
      </p>
    </div>

    ${
      outOfStock.length > 0
        ? `
    <!-- Agotados -->
    <div style="padding:0 28px 20px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#f87171;">🔴 Agotados (${outOfStock.length})</p>
      <div style="border-radius:12px;overflow:hidden;border:1px solid #2f1515;">
        ${outOfStock
          .map(
            (ing, i) => `
        <div style="background:#1c1212;padding:12px 16px;${i < outOfStock.length - 1 ? "border-bottom:1px solid #2f1515;" : ""}display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:13px;font-weight:700;color:#fca5a5;">${ing.name}</span>
          <span style="font-size:12px;font-weight:900;color:#f87171;font-variant-numeric:tabular-nums;">${ing.current_stock} / ${ing.minimum_stock} ${ing.unit} mín</span>
        </div>`,
          )
          .join("")}
      </div>
    </div>
    `
        : ""
    }

    ${
      belowMin.length > 0
        ? `
    <!-- Bajo mínimo -->
    <div style="padding:0 28px 20px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#f59e0b;">🟡 Bajo Mínimo (${belowMin.length})</p>
      <div style="border-radius:12px;overflow:hidden;border:1px solid #2e2010;">
        ${belowMin
          .map(
            (ing, i) => `
        <div style="background:#1a1710;padding:12px 16px;${i < belowMin.length - 1 ? "border-bottom:1px solid #2e2010;" : ""}display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:13px;font-weight:700;color:#fcd34d;">${ing.name}</span>
          <span style="font-size:12px;font-weight:900;color:#f59e0b;font-variant-numeric:tabular-nums;">${ing.current_stock} / ${ing.minimum_stock} ${ing.unit} mín</span>
        </div>`,
          )
          .join("")}
      </div>
    </div>
    `
        : ""
    }

    <!-- CTA -->
    <div style="padding:4px 28px 28px;">
      <a href="${inventoryUrl}"
        style="display:block;text-align:center;background:#FFB7CE;color:#000;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;padding:14px 24px;border-radius:12px;text-decoration:none;">
        Actualizar Inventario →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #2a2a2a;text-align:center;">
      <p style="margin:0;font-size:11px;color:#444;">Este mensaje fue enviado automáticamente por KittnOS · <a href="mailto:${ALERT_FROM}" style="color:#555;text-decoration:none;">${ALERT_FROM}</a></p>
    </div>
  </div>
</body>
</html>`;

    const subject =
      outOfStock.length > 0
        ? `🔴 ${outOfStock.length} ingrediente(s) AGOTADO(S) — ${tenantName}`
        : `🟡 Alerta de stock bajo — ${tenantName}`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${tenantName} <${ALERT_FROM}>`,
      to: recipients,
      subject,
      html,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json(
        { error: "Error al enviar el email", detail: emailError },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      sent: true,
      emailId: emailData?.id,
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

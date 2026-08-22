import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);
const ALERT_FROM = "alerts@trykittn.com";
const ORDERS_FROM = "orders@trykittn.com";

export interface OrderItemEmailData {
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export type TenantEmailInfo = Pick<
  Tables<"tenants">,
  "id" | "name" | "slug" | "system_name"
> & {
  primary_color?: string | null;
  secondary_color?: string | null;
  logo_url?: string | null;
  dark_bg_color?: string | null;
};

export interface NewOrderEmailParams {
  tenant: TenantEmailInfo;
  orderNumber: string | number;
  customerName?: string | null;
  phone?: string | null;
  email?: string | null;
  type: string; // 'takeout' | 'dine-in'
  table?: string;
  notes?: string;
  pickupTime?: string | null;
  items: OrderItemEmailData[];
  subtotal: number;
  tipAmount: number;
  total: number;
}

export interface LowStockItemEmailData {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}

export interface LowStockEmailParams {
  tenant: TenantEmailInfo;
  lowStock: LowStockItemEmailData[];
  outOfStock: LowStockItemEmailData[];
  belowMin: LowStockItemEmailData[];
}

/**
 * Calculates optimal text color (#121212 or #ffffff) based on background hex luminance.
 */
export function getContrastTextColor(hexColor?: string | null): string {
  if (!hexColor) return "#121212";
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6 && hex.length !== 3) return "#121212";

  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  // YIQ luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#121212" : "#ffffff";
}

/**
 * Retrieves email addresses of all ADMIN and MANAGER profiles associated with a given tenant.
 */
export async function getTenantAdminEmails(tenantId: string): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("tenant_id", tenantId)
      .in("role", ["ADMIN", "MANAGER"]);

    if (error || !profiles) {
      console.error("Error fetching admin emails for tenant:", error);
      return [];
    }

    return profiles
      .map((p) => p.email?.trim())
      .filter((email): email is string => Boolean(email && email.includes("@")));
  } catch (err) {
    console.error("Failed to get tenant admin emails:", err);
    return [];
  }
}

/**
 * Helper to build the admin dashboard URL for a tenant.
 */
export function getTenantAdminUrl(slug: string, path = ""): string {
  const isLocal =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      window.location &&
      window.location.hostname.includes("localhost") &&
      process.env.NODE_ENV !== "production");

  if (isLocal) {
    return `http://${slug}.localhost:3000${path}`;
  }
  return `https://${slug}.admin.trykittn.com${path}`;
}

/**
 * Sends an email notification to tenant admins when a new order is paid via Kittn Pickup.
 */
export async function sendNewOrderNotificationEmail(params: NewOrderEmailParams) {
  const {
    tenant,
    orderNumber,
    customerName,
    phone,
    email,
    type,
    table,
    notes,
    pickupTime,
    items,
    subtotal,
    tipAmount,
    total,
  } = params;

  const tenantName = tenant.name || tenant.system_name || "KittnOS";
  const primaryColor = tenant.primary_color || "#FFB7CE";
  const primaryTextColor = getContrastTextColor(primaryColor);
  const logoUrl = tenant.logo_url;
  const recipients = await getTenantAdminEmails(tenant.id);

  if (recipients.length === 0) {
    console.warn(`[Email Notification] No admin emails found for tenant ${tenant.id} (${tenantName}). Skipping email.`);
    return { success: false, reason: "no_recipients" };
  }

  const serviceLabel = type === "dine-in" ? "Comer Aquí / Dine-in" : "Para Llevar / Takeout";
  const formattedPickupTime = pickupTime
    ? new Date(pickupTime).toLocaleTimeString("es-MX", {
        timeZone: "America/Mexico_City",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const now = new Date().toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "full",
    timeStyle: "short",
  });

  const kitchenUrl = getTenantAdminUrl(tenant.slug, "/kitchen");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuevo Pedido #${orderNumber} — ${tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <div style="max-width:580px;margin:30px auto;background:#18181b;border-radius:18px;overflow:hidden;border:1px solid #27272a;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    
    <!-- Header -->
    <div style="background:#27272a;border-bottom:1px solid #3f3f46;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:120px;object-fit:contain;border-radius:8px;" />`
            : ""
        }
        <div>
          <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:${primaryColor};background:${primaryColor}22;padding:4px 10px;border-radius:20px;border:1px solid ${primaryColor}55;">
            🛍️ Kittn Pickup (Pagado)
          </span>
          <h1 style="margin:10px 0 2px;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">
            Pedido #${orderNumber}
          </h1>
          <p style="margin:0;font-size:12px;color:#a1a1aa;">${tenantName} · ${now}</p>
        </div>
      </div>
    </div>

    <!-- Service & Customer Details Box -->
    <div style="padding:24px 28px 16px;">
      <div style="background:#202024;border:1px solid #2e2e33;border-radius:14px;padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;display:block;margin-bottom:2px;">Modalidad</span>
          <strong style="font-size:14px;color:#f4f4f5;">${serviceLabel}</strong>
        </div>
        ${
          formattedPickupTime
            ? `
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#f59e0b;display:block;margin-bottom:2px;">Hora Programada</span>
          <strong style="font-size:14px;color:#fbbf24;">⏰ ${formattedPickupTime}</strong>
        </div>`
            : `
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;display:block;margin-bottom:2px;">Mesa / Destino</span>
          <strong style="font-size:14px;color:#f4f4f5;">${table || "Mostrador"}</strong>
        </div>`
        }
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;display:block;margin-bottom:2px;">Cliente</span>
          <strong style="font-size:14px;color:#f4f4f5;">${customerName || "Cliente Web"}</strong>
        </div>
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;display:block;margin-bottom:2px;">Contacto</span>
          <span style="font-size:13px;color:#a1a1aa;">
            ${phone ? `<a href="tel:${phone}" style="color:${primaryColor};text-decoration:none;font-weight:700;">📞 ${phone}</a>` : ""}
            ${email ? `<br/><a href="mailto:${email}" style="color:#a1a1aa;text-decoration:none;font-size:11px;">✉️ ${email}</a>` : ""}
            ${!phone && !email ? "Sin datos de contacto" : ""}
          </span>
        </div>
      </div>

      ${
        notes
          ? `
      <div style="margin-top:12px;background:#27272a;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:8px;">
        <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:#fbbf24;display:block;">Notas del cliente:</span>
        <p style="margin:2px 0 0;font-size:12px;color:#e4e4e7;font-style:italic;">"${notes}"</p>
      </div>`
          : ""
      }
    </div>

    <!-- Items Breakdown -->
    <div style="padding:0 28px 20px;">
      <h3 style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#a1a1aa;margin:0 0 10px;">
        Detalle de Productos
      </h3>
      <div style="border-radius:12px;overflow:hidden;border:1px solid #2e2e33;background:#202024;">
        ${items
          .map(
            (item, idx) => `
        <div style="padding:12px 16px;${idx < items.length - 1 ? "border-bottom:1px solid #2e2e33;" : ""}display:flex;align-items:flex-start;justify-content:space-between;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:13px;font-weight:900;color:${primaryColor};background:${primaryColor}22;padding:2px 7px;border-radius:6px;">
                ${item.quantity}x
              </span>
              <strong style="font-size:13px;color:#ffffff;">${item.name}</strong>
            </div>
            ${
              item.notes
                ? `<p style="margin:4px 0 0 30px;font-size:11px;color:#a1a1aa;font-style:italic;">Notas: ${item.notes}</p>`
                : ""
            }
          </div>
          <span style="font-size:13px;font-weight:800;color:#f4f4f5;font-variant-numeric:tabular-nums;margin-left:12px;">
            ${formatCurrency(item.unitPrice * item.quantity)}
          </span>
        </div>`,
          )
          .join("")}
      </div>
    </div>

    <!-- Financial Totals -->
    <div style="padding:0 28px 24px;">
      <div style="background:#202024;border:1px solid #2e2e33;border-radius:12px;padding:14px 18px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#a1a1aa;margin-bottom:6px;">
          <span>Subtotal</span>
          <span style="font-variant-numeric:tabular-nums;color:#d4d4d8;">${formatCurrency(subtotal)}</span>
        </div>
        ${
          tipAmount > 0
            ? `
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#a1a1aa;margin-bottom:6px;">
          <span>Propina digital</span>
          <span style="font-variant-numeric:tabular-nums;color:#34d399;font-weight:700;">+ ${formatCurrency(tipAmount)}</span>
        </div>`
            : ""
        }
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:900;color:#ffffff;border-top:1px solid #2e2e33;padding-top:8px;margin-top:6px;">
          <span>Total Cobrado (Stripe)</span>
          <span style="font-variant-numeric:tabular-nums;color:${primaryColor};">${formatCurrency(total + tipAmount)}</span>
        </div>
      </div>
    </div>

    <!-- CTA Button with Dynamic Tenant Color -->
    <div style="padding:0 28px 28px;">
      <a href="${kitchenUrl}"
        style="display:block;text-align:center;background:${primaryColor};color:${primaryTextColor};font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;padding:15px 24px;border-radius:14px;text-decoration:none;box-shadow:0 4px 14px ${primaryColor}44;">
        Ver Pedido en Cocina (KDS) →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #27272a;text-align:center;background:#141416;">
      <p style="margin:0;font-size:11px;color:#52525b;">
        Este pedido fue procesado digitalmente por Kittn Pickup para <strong>${tenantName}</strong>.
      </p>
    </div>
  </div>
</body>
</html>`;

  const subject = `🛍️ Nuevo pedido #${orderNumber} (${type === "dine-in" ? "Comer Aquí" : "Para Llevar"}) — ${tenantName}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${tenantName} <${ORDERS_FROM}>`,
      to: recipients,
      subject,
      html,
    });

    if (error) {
      console.error("[Resend Error] Failed to send order notification:", error);
      return { success: false, error };
    }

    console.log(`[Email Notification] Order #${orderNumber} email sent successfully to ${recipients.join(", ")} (id: ${data?.id})`);
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("[Email Notification Exception] Error sending order email:", err);
    return { success: false, error: err };
  }
}

/**
 * Sends a low-stock / out-of-stock email alert to tenant admins using dynamic tenant branding.
 */
export async function sendLowStockAlertEmail(params: LowStockEmailParams) {
  const { tenant, lowStock, outOfStock, belowMin } = params;

  const tenantName = tenant.name || tenant.system_name || "KittnOS";
  const primaryColor = tenant.primary_color || "#FFB7CE";
  const primaryTextColor = getContrastTextColor(primaryColor);
  const logoUrl = tenant.logo_url;
  const inventoryUrl = getTenantAdminUrl(tenant.slug, "/inventario");
  const recipients = await getTenantAdminEmails(tenant.id);

  if (recipients.length === 0) {
    console.warn(
      `[Inventory Alert] No admin emails found for tenant ${tenant.id} (${tenantName}). Skipping email.`,
    );
    return { success: false, reason: "no_recipients" };
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
  <div style="max-width:560px;margin:40px auto;background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
    <!-- Header -->
    <div style="background:#1f1f1f;border-bottom:1px solid #2a2a2a;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;background:#ef444420;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">⚠️</div>
        <div>
          <p style="margin:0;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#f87171;">Alerta de Inventario</p>
          <p style="margin:0;font-size:12px;color:#a1a1aa;font-weight:500;">${tenantName} · ${now}</p>
        </div>
      </div>
      ${
        logoUrl
          ? `<img src="${logoUrl}" alt="${tenantName}" style="height:36px;max-width:100px;object-fit:contain;border-radius:6px;" />`
          : ""
      }
    </div>

    <!-- Summary -->
    <div style="padding:24px 28px 0;">
      <p style="margin:0 0 16px;font-size:14px;color:#a1a1aa;font-weight:500;">
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

    <!-- CTA Button with Dynamic Tenant Color -->
    <div style="padding:4px 28px 28px;">
      <a href="${inventoryUrl}"
        style="display:block;text-align:center;background:${primaryColor};color:${primaryTextColor};font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;padding:14px 24px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px ${primaryColor}44;">
        Actualizar Inventario →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #2a2a2a;text-align:center;background:#141416;">
      <p style="margin:0;font-size:11px;color:#52525b;">Este mensaje fue enviado automáticamente por ${tenantName} · <a href="mailto:${ALERT_FROM}" style="color:#71717a;text-decoration:none;">${ALERT_FROM}</a></p>
    </div>
  </div>
</body>
</html>`;

  const subject =
    outOfStock.length > 0
      ? `🔴 ${outOfStock.length} ingrediente(s) AGOTADO(S) — ${tenantName}`
      : `🟡 Alerta de stock bajo — ${tenantName}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${tenantName} <${ALERT_FROM}>`,
      to: recipients,
      subject,
      html,
    });

    if (error) {
      console.error("[Resend Error] Failed to send low stock alert:", error);
      return { success: false, error };
    }

    console.log(
      `[Inventory Alert Email] Low stock alert sent to ${recipients.join(", ")} (id: ${data?.id})`,
    );
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("[Inventory Alert Exception] Error sending low stock email:", err);
    return { success: false, error: err };
  }
}

/**
 * Helper to build the customer pickup URL for a tenant.
 */
export function getTenantPickupUrl(slug: string, path = ""): string {
  const isLocal =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      window.location &&
      window.location.hostname.includes("localhost") &&
      process.env.NODE_ENV !== "production");

  if (isLocal) {
    return `http://${slug}.localhost:5173${path}`;
  }
  return `https://${slug}.trykittn.com${path}`;
}

export interface CustomerOrderEmailParams {
  tenant: TenantEmailInfo;
  orderId: string;
  orderNumber: string | number;
  customerName?: string | null;
  customerEmail: string;
  type: string; // 'takeout' | 'dine-in'
  table?: string;
  pickupTime?: string | null;
  items: OrderItemEmailData[];
  subtotal: number;
  tipAmount: number;
  total: number;
}

/**
 * Sends a friendly branded confirmation email to the customer with live tracking link.
 */
export async function sendCustomerOrderConfirmationEmail(params: CustomerOrderEmailParams) {
  const {
    tenant,
    orderId,
    orderNumber,
    customerName,
    customerEmail,
    type,
    table,
    pickupTime,
    items,
    subtotal,
    tipAmount,
    total,
  } = params;

  if (!customerEmail || !customerEmail.includes("@")) {
    return { success: false, reason: "invalid_email" };
  }

  const tenantName = tenant.name || tenant.system_name || "Kittn";
  const primaryColor = tenant.primary_color || "#FFB7CE";
  const primaryTextColor = getContrastTextColor(primaryColor);
  const logoUrl = tenant.logo_url;

  const serviceLabel = type === "dine-in" ? "Comer Aquí" : "Para Llevar";
  const formattedPickupTime = pickupTime
    ? new Date(pickupTime).toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const trackingUrl = getTenantPickupUrl(tenant.slug, `/?order_id=${orderId}`);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmación de tu Pedido #${orderNumber} — ${tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <div style="max-width:540px;margin:30px auto;background:#18181b;border-radius:24px;overflow:hidden;border:1px solid #27272a;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
    
    <!-- Header with Branding -->
    <div style="background:#202024;border-bottom:1px solid #2e2e33;padding:28px 24px;text-align:center;">
      ${
        logoUrl
          ? `<img src="${logoUrl}" alt="${tenantName}" style="height:50px;max-width:140px;object-fit:contain;border-radius:12px;margin-bottom:16px;" />`
          : ""
      }
      <div style="display:inline-block;margin-bottom:8px;">
        <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:${primaryColor};background:${primaryColor}18;padding:4px 12px;border-radius:20px;border:1px solid ${primaryColor}44;">
          ✅ Pedido Confirmado
        </span>
      </div>
      <h1 style="margin:8px 0 4px;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">
        ¡Gracias por tu compra${customerName ? `, ${customerName}` : ""}!
      </h1>
      <p style="margin:0;font-size:13px;color:#a1a1aa;">
        Folio <strong style="color:#ffffff;">#${orderNumber}</strong> en ${tenantName}
      </p>
    </div>

    <!-- Live Tracking CTA -->
    <div style="padding:24px 24px 12px;text-align:center;">
      <a href="${trackingUrl}" target="_blank" style="display:block;background:${primaryColor};color:${primaryTextColor};text-decoration:none;font-weight:900;font-size:14px;padding:16px 24px;border-radius:16px;box-shadow:0 6px 20px ${primaryColor}40;letter-spacing:-0.01em;">
        📍 Ver estado de mi pedido en vivo →
      </a>
    </div>

    <!-- Order Info Card -->
    <div style="padding:12px 24px 16px;">
      <div style="background:#202024;border:1px solid #2e2e33;border-radius:16px;padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;display:block;margin-bottom:2px;">Modalidad</span>
          <strong style="font-size:13px;color:#f4f4f5;">${serviceLabel}</strong>
        </div>
        ${
          formattedPickupTime
            ? `
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#f59e0b;display:block;margin-bottom:2px;">Hora de recogida</span>
          <strong style="font-size:13px;color:#fbbf24;">⏰ ${formattedPickupTime}</strong>
        </div>`
            : `
        <div>
          <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#71717a;display:block;margin-bottom:2px;">Mesa / Destino</span>
          <strong style="font-size:13px;color:#f4f4f5;">${table || "Mostrador"}</strong>
        </div>`
        }
      </div>
    </div>

    <!-- Items Breakdown -->
    <div style="padding:0 24px 16px;">
      <h3 style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#a1a1aa;margin:0 0 10px;">
        Resumen de tu Orden
      </h3>
      <div style="border-radius:16px;overflow:hidden;border:1px solid #2e2e33;background:#202024;">
        ${items
          .map(
            (item, idx) => `
        <div style="padding:12px 16px;${idx < items.length - 1 ? "border-bottom:1px solid #2e2e33;" : ""}display:flex;align-items:flex-start;justify-content:space-between;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:12px;font-weight:900;color:${primaryColor};background:${primaryColor}18;padding:2px 6px;border-radius:6px;">
                ${item.quantity}x
              </span>
              <strong style="font-size:13px;color:#ffffff;">${item.name}</strong>
            </div>
            ${
              item.notes
                ? `<p style="margin:3px 0 0 28px;font-size:11px;color:#a1a1aa;font-style:italic;">Notas: ${item.notes}</p>`
                : ""
            }
          </div>
          <span style="font-size:13px;font-weight:800;color:#f4f4f5;margin-left:12px;">
            ${formatCurrency(item.unitPrice * item.quantity)}
          </span>
        </div>`,
          )
          .join("")}
      </div>
    </div>

    <!-- Financial Totals -->
    <div style="padding:0 24px 24px;">
      <div style="background:#202024;border:1px solid #2e2e33;border-radius:16px;padding:14px 18px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#a1a1aa;margin-bottom:6px;">
          <span>Subtotal</span>
          <span style="color:#d4d4d8;">${formatCurrency(subtotal)}</span>
        </div>
        ${
          tipAmount > 0
            ? `
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#a1a1aa;margin-bottom:6px;">
          <span>Propina</span>
          <span style="color:#34d399;font-weight:700;">+ ${formatCurrency(tipAmount)}</span>
        </div>`
            : ""
        }
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:900;color:#ffffff;border-top:1px solid #2e2e33;padding-top:8px;margin-top:4px;">
          <span>Total Pagado</span>
          <span style="color:${primaryColor};">${formatCurrency(total + tipAmount)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#202024;border-top:1px solid #2e2e33;padding:18px 24px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#71717a;">
        Este recibo fue generado automáticamente para tu compra en <strong>${tenantName}</strong> a través de Kittn Pickup.
      </p>
    </div>

  </div>
</body>
</html>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${tenantName} <${ORDERS_FROM}>`,
      to: [customerEmail],
      subject: `Confirmación de pedido #${orderNumber} — ${tenantName}`,
      html,
    });

    if (error) {
      console.error("[Email Customer Confirmation] Resend API error:", error);
      return { success: false, error };
    }

    console.log(
      `[Email Customer Confirmation] Sent confirmation email for order #${orderNumber} to ${customerEmail} (ID: ${data?.id})`,
    );
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email Customer Confirmation] Unexpected error:", err);
    return { success: false, error: err };
  }
}

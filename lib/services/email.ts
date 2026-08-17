import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);
const DEFAULT_FROM = "alerts@trykittn.com";
const ORDERS_FROM = "orders@trykittn.com";

export interface OrderItemEmailData {
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface NewOrderEmailParams {
  tenant: Pick<Tables<"tenants">, "id" | "name" | "slug" | "system_name">;
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
  tenant: Pick<Tables<"tenants">, "id" | "name" | "slug" | "system_name">;
  lowStock: LowStockItemEmailData[];
  outOfStock: LowStockItemEmailData[];
  belowMin: LowStockItemEmailData[];
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
      <div>
        <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#10b981;background:rgba(16,185,129,0.15);padding:4px 10px;border-radius:20px;border:1px solid rgba(16,185,129,0.3);">
          🛍️ Kittn Pickup (Pagado)
        </span>
        <h1 style="margin:10px 0 2px;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">
          Pedido #${orderNumber}
        </h1>
        <p style="margin:0;font-size:12px;color:#a1a1aa;">${tenantName} · ${now}</p>
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
            ${phone ? `<a href="tel:${phone}" style="color:#38bdf8;text-decoration:none;font-weight:700;">📞 ${phone}</a>` : ""}
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
              <span style="font-size:13px;font-weight:900;color:#10b981;background:rgba(16,185,129,0.15);padding:2px 7px;border-radius:6px;">
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
      <div style="background:#202024;border:1px solid #2e2e33;border-radius:12px;padding:14px 18px;space-y:6px;">
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
          <span style="font-variant-numeric:tabular-nums;color:#10b981;">${formatCurrency(total + tipAmount)}</span>
        </div>
      </div>
    </div>

    <!-- CTA Button -->
    <div style="padding:0 28px 28px;">
      <a href="${kitchenUrl}"
        style="display:block;text-align:center;background:#FFB7CE;color:#121212;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;padding:15px 24px;border-radius:14px;text-decoration:none;box-shadow:0 4px 14px rgba(255,183,206,0.25);">
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

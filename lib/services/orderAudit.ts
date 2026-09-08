import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendTenantPushNotification,
  type PushNotificationPayload,
} from "@/lib/services/push";
import type { OrderAuditActionType, OrderAuditLog } from "@/types";

export interface OrderAuditUser {
  id?: string | null;
  full_name?: string | null;
  name?: string | null;
  role?: string | null;
}

export interface LogOrderActionParams {
  orderId: string;
  tenantId: string;
  user?: OrderAuditUser | null;
  actionType: OrderAuditActionType | string;
  details?: Record<string, unknown> | null;
  notifyCritical?: boolean;
}

/**
 * Retorna un título y cuerpo conciso en español para notificaciones Web Push según el evento.
 */
export function getPushNotificationCopy(
  actionType: string,
  userName: string,
  details?: Record<string, unknown> | null,
): { title: string; body: string } {
  const isAuthorized = Boolean(
    details?.authorizedBy &&
      String(details.authorizedBy).trim() !== "" &&
      String(details.authorizedBy).trim().toLowerCase() !==
        userName.trim().toLowerCase(),
  );
  const authorizedSuffix = isAuthorized
    ? ` (Autorizado por ${details?.authorizedBy})`
    : "";

  switch (actionType) {
    case "ITEMS_REMOVED": {
      const detailMsg = details?.summary ? ` ${details.summary}` : "";
      return {
        title: "Alerta: Productos eliminados",
        body: `${userName} eliminó productos en la orden.${detailMsg}${authorizedSuffix}`,
      };
    }
    case "CANCELLED": {
      const reasonMsg = details?.reason ? ` Motivo: ${details.reason}.` : "";
      return {
        title: "Alerta: Comanda cancelada",
        body: `${userName} canceló la orden.${reasonMsg}${authorizedSuffix}`,
      };
    }
    case "DISCOUNT_APPLIED": {
      const discountMsg = details?.discountValue
        ? ` (${details.discountType === "PERCENT" ? `${details.discountValue}%` : `$${details.discountValue}`})`
        : "";
      return {
        title: "Alerta: Descuento aplicado",
        body: `${userName} aplicó un descuento${discountMsg}.${authorizedSuffix}`,
      };
    }
    case "REOPENED": {
      const reasonMsg = details?.reason ? ` ${details.reason}.` : "";
      return {
        title: "Alerta: Reapertura de comanda",
        body: `${userName} reabrió la cuenta.${reasonMsg}${authorizedSuffix}`,
      };
    }
    default:
      return {
        title: "Modificación de comanda",
        body: `${userName} realizó cambios en la comanda.${authorizedSuffix}`,
      };
  }
}

/**
 * Registra una acción de auditoría de comanda en base de datos y consola de servidor,
 * y opcionalmente dispara notificación Web Push a ADMIN y MANAGER.
 */
export async function logOrderAction({
  orderId,
  tenantId,
  user,
  actionType,
  details = {},
  notifyCritical = false,
}: LogOrderActionParams): Promise<{ success: boolean; log?: OrderAuditLog; error?: unknown }> {
  const userName =
    user?.full_name?.trim() ||
    user?.name?.trim() ||
    user?.role ||
    "Sistema";

  const userId = user?.id || null;

  // 1. Log estructurado en consola del servidor
  console.log(
    `[ORDER_AUDIT] [${actionType}] Order: ${orderId} | User: ${userName} (${userId || "N/A"}) | Tenant: ${tenantId}`,
  );

  try {
    const supabase = createAdminClient();

    // 2. Persistencia en la tabla order_audit_logs
    const { data, error } = await supabase
      .from("order_audit_logs")
      .insert({
        order_id: orderId,
        tenant_id: tenantId,
        user_id: userId,
        user_name: userName,
        action_type: actionType,
        details: (details as Record<string, unknown>) || {},
      })
      .select()
      .single();

    if (error) {
      console.error("[ORDER_AUDIT] Error al insertar registro de auditoría:", error);
    }

    // 3. Alertas Web Push a Gerencia (ADMIN, MANAGER) si es crítico
    if (notifyCritical) {
      try {
        const { title, body } = getPushNotificationCopy(
          actionType,
          userName,
          details,
        );

        const pushPayload: PushNotificationPayload = {
          title,
          body,
          url: `/history`,
          tag: `order-audit-${orderId}`,
        };

        await sendTenantPushNotification(tenantId, pushPayload, [
          "ADMIN",
          "MANAGER",
        ]);
      } catch (pushErr) {
        console.error(
          "[ORDER_AUDIT] Excepción al enviar Web Push a Gerencia:",
          pushErr,
        );
      }
    }

    return {
      success: !error,
      log: data as OrderAuditLog | undefined,
      error,
    };
  } catch (exception) {
    console.error(
      "[ORDER_AUDIT] Excepción en logOrderAction:",
      exception,
    );
    return { success: false, error: exception };
  }
}

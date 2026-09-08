"use client";

import React, { useEffect, useState } from "react";
import {
  Receipt,
  ShoppingBag,
  User,
  History,
  Clock,
  PlusCircle,
  Trash2,
  Tag,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import type { Order } from "./types";
import type { OrderAuditLog } from "@/types";

export interface OrderDetailExpandedProps {
  order: Order;
  onBillOrder: (order: Order) => void;
  initialAuditLogs?: OrderAuditLog[];
}

interface ActionBadgeConfig {
  badgeClass: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getActionBadgeConfig(actionType: string): ActionBadgeConfig {
  switch (actionType) {
    case "CREATED":
      return {
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        label: "Comanda creada",
        icon: PlusCircle,
      };
    case "ITEMS_ADDED":
      return {
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        label: "Productos agregados",
        icon: PlusCircle,
      };
    case "ITEMS_REMOVED":
      return {
        badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
        label: "Productos eliminados",
        icon: Trash2,
      };
    case "CANCELLED":
      return {
        badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
        label: "Comanda cancelada",
        icon: ShieldAlert,
      };
    case "DISCOUNT_APPLIED":
      return {
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        label: "Descuento aplicado",
        icon: Tag,
      };
    case "PAID":
      return {
        badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        label: "Comanda pagada",
        icon: CheckCircle2,
      };
    case "REOPENED":
      return {
        badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        label: "Cuenta reabierta",
        icon: RotateCcw,
      };
    default:
      return {
        badgeClass: "bg-white/10 text-text-light/80 border-white/20",
        label: "Modificación",
        icon: Clock,
      };
  }
}

function formatLogMessage(log: OrderAuditLog): string {
  const details = log.details || {};
  const authorizedSuffix = details.authorizedBy
    ? ` (Autorizado con PIN)`
    : "";

  switch (log.action_type) {
    case "CREATED": {
      const summary = details.summary
        ? `: ${details.summary}`
        : details.itemsCount
          ? `: ${details.itemsCount} productos`
          : "";
      return `${log.user_name} comandó${summary}`;
    }
    case "ITEMS_ADDED": {
      const summary = details.summary ? `: ${details.summary}` : "";
      return `${log.user_name} agregó${summary}`;
    }
    case "ITEMS_REMOVED": {
      const summary = details.summary ? `: ${details.summary}` : "";
      return `${log.user_name} eliminó${summary}${authorizedSuffix}`;
    }
    case "CANCELLED": {
      const reasonMsg = details.reason ? ` (${details.reason})` : "";
      return `${log.user_name} canceló la orden${reasonMsg}${authorizedSuffix}`;
    }
    case "DISCOUNT_APPLIED": {
      const value = details.discountValue
        ? details.discountType === "PERCENT"
          ? `-${details.discountValue}%`
          : `-$${Number(details.discountValue).toFixed(2)}`
        : "";
      const reason = details.discountReason ? ` (${details.discountReason})` : "";
      return `${log.user_name} aplicó descuento: ${value}${reason}${authorizedSuffix}`;
    }
    case "PAID": {
      const method = details.method ? ` (${details.method})` : "";
      return `${log.user_name} registró cobro${method}`;
    }
    case "REOPENED": {
      const reason = details.reason ? `: ${details.reason}` : "";
      return `${log.user_name} reabrió la cuenta${reason}${authorizedSuffix}`;
    }
    default:
      return `${log.user_name} modificó la comanda${authorizedSuffix}`;
  }
}

function formatLogTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Mexico_City",
  });
}

export function OrderDetailExpanded({
  order,
  onBillOrder,
  initialAuditLogs,
}: OrderDetailExpandedProps) {
  const [fetchedLogs, setFetchedLogs] = useState<OrderAuditLog[] | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialAuditLogs);

  const logs = initialAuditLogs ?? fetchedLogs ?? [];

  useEffect(() => {
    if (initialAuditLogs) {
      return;
    }

    let isMounted = true;

    fetch(`/api/orders/${order.id}/audit`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed"))))
      .then((data) => {
        if (isMounted) {
          setFetchedLogs(data.logs || []);
        }
      })
      .catch((err) => {
        console.error("Error al cargar historial de auditoría:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [order.id, initialAuditLogs]);

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h4 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            Detalle de la Orden #{order.orderNumber}
          </h4>
          {order.customer && (
            <span className="text-xs text-text-light/70 font-medium flex items-center gap-1">
              <User className="h-3 w-3 text-text-light/40" />
              {order.customer.name}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBillOrder(order);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-[10px] font-black text-blue-400 hover:bg-blue-500/20 transition-all uppercase tracking-wider cursor-pointer"
        >
          <Receipt className="h-3.5 w-3.5" /> Facturar Orden
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] font-bold text-text-light/40 border-b border-border">
              <th className="pb-1 text-left">Producto</th>
              <th className="pb-1 text-center">Cant.</th>
              <th className="pb-1 text-right">P. Unit</th>
              <th className="pb-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.orderItems?.map((item) => {
              const unitPrice = Number(item.unitPrice || 0);
              const subtotal = item.quantity * unitPrice;
              return (
                <tr key={item.id}>
                  <td className="py-1.5 font-bold text-text-light">
                    {item.menuItem?.name || "Producto"}
                    {item.notes && (
                      <span className="text-[10px] text-amber-400/80 block font-normal">
                        Notas: {item.notes}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-center font-mono">
                    {item.quantity}
                  </td>
                  <td className="py-1.5 text-right font-mono text-text-light/60">
                    ${unitPrice.toFixed(2)}
                  </td>
                  <td className="py-1.5 text-right font-mono font-bold text-text-light">
                    ${subtotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {order.notes && (
        <div className="pt-2 border-t border-border text-[11px] text-text-light/60">
          <span className="font-bold text-text-light/80">Notas generales: </span>
          {order.notes}
        </div>
      )}

      {/* Historial de Modificaciones Cronológico */}
      <div className="pt-3 border-t border-border space-y-2.5">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-primary" />
          <h5 className="text-[11px] font-black text-text-light/70 uppercase tracking-wider">
            Historial de Modificaciones
          </h5>
        </div>

        {loading ? (
          <div className="text-[11px] text-text-light/40 py-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            Cargando historial...
          </div>
        ) : logs.length === 0 ? (
          <p className="text-[11px] text-text-light/40 py-1 italic">
            Sin modificaciones registradas
          </p>
        ) : (
          <div className="space-y-2" data-testid="audit-timeline">
            {logs.map((log) => {
              const badge = getActionBadgeConfig(log.action_type);
              const Icon = badge.icon;
              const formattedTime = formatLogTime(log.created_at);
              const message = formatLogMessage(log);

              return (
                <div
                  key={log.id}
                  data-testid={`audit-log-item-${log.id}`}
                  className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-black/20 p-2 text-xs transition-colors hover:bg-black/30"
                >
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${badge.badgeClass}`}
                  >
                    <Icon className="h-3 w-3" />
                    {badge.label}
                  </span>

                  <div className="flex-1 min-w-0 text-[11px] leading-relaxed text-text-light/90">
                    <span className="font-mono text-text-light/50 mr-1.5">
                      {formattedTime ? `${formattedTime} •` : ""}
                    </span>
                    <span>{message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

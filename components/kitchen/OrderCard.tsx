"use client";

import { OrderStatus, type OrderWithDetails } from "@/types";
import {
  Clock,
  Check,
  Utensils,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useOrderTimer, getElapsedSeconds } from "@/hooks/useOrders";
import { formatTime } from "@/lib/utils";

interface OrderCardProps {
  order: OrderWithDetails;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onItemReady?: (orderId: string, itemId: string) => void;
  updatingItemIds?: Set<string>;
}

/**
 * KDS Order Card Component
 * Displays order details with real-time timer and status management
 */
export function OrderCard({
  order,
  onStatusChange,
  onItemReady,
  updatingItemIds,
}: OrderCardProps) {
  const ALERT_THRESHOLD_MINUTES = 15;
  const elapsedSeconds = useOrderTimer(order.createdAt);
  const isOverdue = elapsedSeconds / 60 >= ALERT_THRESHOLD_MINUTES;

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[11px] font-black text-amber-400 uppercase tracking-widest">
            <Clock className="h-3.5 w-3.5" /> Pendiente
          </span>
        );
      case OrderStatus.PREPARING:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-[11px] font-black text-blue-400 uppercase tracking-widest">
            <Utensils className="h-3.5 w-3.5" /> En Preparación
          </span>
        );
      case OrderStatus.READY:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-black text-emerald-400 uppercase tracking-widest">
            <CheckCircle2 className="h-3.5 w-3.5" /> Listo
          </span>
        );
      case OrderStatus.DELIVERED:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700/60 px-3 py-1 text-[11px] font-black text-zinc-400 uppercase tracking-widest">
            Entregado
          </span>
        );
      default:
        return null;
    }
  };

  const activeItems = order.orderItems.filter(
    (item) => item.status !== OrderStatus.DELIVERED,
  );
  const allReady =
    activeItems.length > 0 &&
    activeItems.every((item) => item.status === OrderStatus.READY);

  return (
    <div
      className={`rounded-2xl border p-5 shadow-md transition-all duration-300 ${
        isOverdue &&
        order.status !== OrderStatus.DELIVERED &&
        order.status !== OrderStatus.READY
          ? "border-red-500/70 bg-gradient-to-b from-[#2A1212] to-[#1F0C0C] shadow-lg shadow-red-950/40 ring-1 ring-red-500/20"
          : "border-border bg-card-light hover:border-border/80 hover:shadow-xl"
      }`}
    >
      {/* Card Header */}
      <div className="mb-4 flex items-start justify-between border-b border-border/60 pb-3.5">
        <div>
          <h3 className="text-2xl font-black text-text-light tracking-tight uppercase">
            #{order.orderNumber}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {order.table && (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                <Utensils className="h-3.5 w-3.5 text-amber-500" /> Mesa:{" "}
                {order.table}
              </span>
            )}
            {order.payments && order.payments.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                Pagado Online
              </span>
            )}
          </div>
        </div>

        {/* Timer Badge */}
        <div
          className={`rounded-xl px-3.5 py-1.5 font-mono text-base font-black shadow-inner flex items-center gap-1.5 transition-colors ${
            isOverdue &&
            order.status !== OrderStatus.DELIVERED &&
            order.status !== OrderStatus.READY
              ? "bg-red-600 text-white shadow-red-900/50 ring-2 ring-red-400/40"
              : "bg-card text-text-light border border-border"
          }`}
        >
          <Clock
            className={`h-4 w-4 ${isOverdue ? "animate-spin" : ""}`}
            style={{ animationDuration: "3s" }}
          />
          {formatTime(elapsedSeconds)}
        </div>
      </div>

      {/* Order Items List */}
      <div className="mb-4 space-y-2.5">
        {activeItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-colors hover:border-border/80"
          >
            <div className="flex-1 pr-3">
              <p className="font-bold text-text-light text-sm leading-snug">
                <span className="text-amber-400 font-black mr-1 text-base">
                  {item.quantity}x
                </span>{" "}
                {item.menuItem.name}
              </p>
              {item.notes && (
                <p className="mt-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 text-amber-400" />{" "}
                  Nota: {item.notes}
                </p>
              )}
            </div>

            {order.status === OrderStatus.PREPARING && (
              <div className="flex flex-col items-end justify-center min-w-[76px]">
                {item.status === OrderStatus.READY ? (
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 text-xs font-black text-emerald-400 uppercase tracking-wider min-h-[44px]">
                    <Check className="h-4 w-4" /> LISTO
                  </span>
                ) : (
                  <button
                    onClick={() => onItemReady?.(order.id, item.id)}
                    disabled={updatingItemIds?.has(item.id)}
                    className="min-h-[44px] min-w-[76px] rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-xs font-black text-emerald-400 uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 active:scale-95 cursor-pointer flex items-center justify-center shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
                  >
                    {updatingItemIds?.has(item.id) ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      "Listo"
                    )}
                  </button>
                )}
                {item.preparationTimeSeconds != null ? (
                  <span className="mt-1 text-[10px] text-text-light/60 font-mono">
                    {formatTime(item.preparationTimeSeconds)}
                  </span>
                ) : item.status !== OrderStatus.READY && item.createdAt ? (
                  <span className="mt-1 text-[10px] text-text-light/60 font-mono">
                    {formatTime(getElapsedSeconds(item.createdAt))}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Order Level Notes */}
      {order.notes && (
        <div className="mb-4 rounded-xl border-l-4 border-amber-500 bg-amber-500/10 p-3">
          <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" />{" "}
            Nota de Orden: {order.notes}
          </p>
        </div>
      )}

      {/* Order Status Badge */}
      <div className="mb-4 flex items-center justify-between">
        {getStatusBadge(order.status)}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {order.status === OrderStatus.PENDING && (
          <button
            onClick={() => onStatusChange(order.id, OrderStatus.PREPARING)}
            className="w-full min-h-[48px] rounded-xl bg-amber-500 px-4 py-3 text-xs font-black text-zinc-950 uppercase tracking-wider hover:bg-amber-400 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 outline-none"
          >
            Comenzar Preparación <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {order.status === OrderStatus.PREPARING && (
          <button
            onClick={() => onStatusChange(order.id, OrderStatus.READY)}
            disabled={!allReady}
            className="w-full min-h-[48px] rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white uppercase tracking-wider hover:bg-emerald-500 transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 outline-none"
          >
            <CheckCircle2 className="h-4 w-4" /> Cerrar Orden
          </button>
        )}

        {order.status === OrderStatus.READY && (
          <button
            onClick={() => onStatusChange(order.id, OrderStatus.DELIVERED)}
            className="w-full min-h-[48px] rounded-xl bg-card-light border border-border px-4 py-3 text-xs font-black text-text-light uppercase tracking-wider hover:bg-card-light/80 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-400 outline-none"
          >
            Marcar Entregado
          </button>
        )}
      </div>
    </div>
  );
}

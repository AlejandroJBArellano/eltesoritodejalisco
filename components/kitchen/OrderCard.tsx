"use client";

import { memo, useMemo } from "react";

import { useOrderTimer } from "@/hooks/useOrders";
import { formatTime } from "@/lib/utils";
import { OrderStatus, type OrderWithDetails } from "@/types";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  Clock,
  ShoppingBag,
  User,
  Utensils,
} from "lucide-react";
import { formatServiceLabel, getServiceType } from "@/lib/utils/serviceType";

interface OrderCardProps {
  order: OrderWithDetails;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onItemReady?: (orderId: string, itemId: string) => void;
  updatingItemIds?: Set<string>;
}

interface OrderItemRowProps {
  item: OrderWithDetails["orderItems"][number];
  orderId: string;
  orderStatus: OrderStatus;
  timerStartTime: Date;
  onItemReady?: (orderId: string, itemId: string) => void;
  isUpdating: boolean;
}

const OrderItemRow = memo(function OrderItemRow({
  item,
  orderId,
  orderStatus,
  timerStartTime,
  onItemReady,
  isUpdating,
}: OrderItemRowProps) {
  const isItemReady = item.status === OrderStatus.READY;
  const elapsedSeconds = useOrderTimer(
    timerStartTime,
    isItemReady ? timerStartTime : null,
  );

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-border/80">
      <div className="flex-1 pr-2.5">
        <p className="font-semibold text-text-light text-sm leading-snug">
          <span className="text-amber-400 font-mono font-bold mr-1 text-sm">
            {item.quantity}x
          </span>{" "}
          {item.menuItem.name}
        </p>
        {item.notes && (
          <div className="mt-1 text-xs font-medium text-amber-300 bg-amber-500/10 p-1.5 rounded-md border border-amber-500/20 flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />{" "}
            <span>Nota: {item.notes}</span>
          </div>
        )}
      </div>

      {orderStatus === OrderStatus.PREPARING && (
        <div className="flex flex-col items-end justify-center min-w-19">
          {isItemReady ? (
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider min-h-9">
              <Check className="h-3.5 w-3.5" /> LISTO
            </span>
          ) : (
            <button
              onClick={() => onItemReady?.(orderId, item.id)}
              disabled={isUpdating}
              className="min-h-9 min-w-18 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider hover:bg-emerald-500 hover:text-dark transition-all duration-150 disabled:opacity-50 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
            >
              {isUpdating ? (
                <span className="animate-pulse">...</span>
              ) : (
                "Listo"
              )}
            </button>
          )}
          {item.preparationTimeSeconds != null ? (
            <span className="mt-1 text-[10px] text-text-light/60 font-mono tabular-nums">
              {formatTime(item.preparationTimeSeconds)}
            </span>
          ) : !isItemReady && item.createdAt ? (
            <span className="mt-1 text-[10px] text-text-light/60 font-mono tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
});

/**
 * KDS Order Card Component
 * Displays order details with real-time timer and status management
 */
export const OrderCard = memo(
  function OrderCard({
    order,
    onStatusChange,
    onItemReady,
    updatingItemIds,
  }: OrderCardProps) {
    const ALERT_THRESHOLD_MINUTES = 15;
    const isCompleted =
      order.status === OrderStatus.READY ||
      order.status === OrderStatus.DELIVERED;
    const endTime = isCompleted ? order.completedAt || order.updatedAt : null;

    const timerStartTime = useMemo(() => {
      if (order.pickupTime) {
        return new Date(new Date(order.pickupTime).getTime() - 30 * 60 * 1000);
      }
      return order.createdAt;
    }, [order.pickupTime, order.createdAt]);

    const elapsedSeconds = useOrderTimer(timerStartTime, endTime);
    const isOverdue = elapsedSeconds / 60 >= ALERT_THRESHOLD_MINUTES;

    const activeItems = order.orderItems.filter(
      (item) => item.status !== OrderStatus.DELIVERED,
    );
    const allReady =
      activeItems.length > 0 &&
      activeItems.every((item) => item.status === OrderStatus.READY);

    return (
      <div
        className={`rounded-xl border p-3 shadow-xs transition-all duration-150 ${
          isOverdue &&
          order.status !== OrderStatus.DELIVERED &&
          order.status !== OrderStatus.READY
            ? "border-rose-500/70 bg-rose-950/30 shadow-md ring-1 ring-rose-500/20"
            : "border-border bg-card-light/70 hover:border-border/80 hover:bg-card-light"
        }`}
      >
        {/* Service Type & Table Prominent Banner */}
        {(() => {
          const serviceType = getServiceType(order.table);
          return (
            <div
              className={`-mx-3 -mt-3 mb-3 px-3.5 py-2 rounded-t-xl border-b flex items-center justify-between gap-2 ${
                serviceType === "domicilio"
                  ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
                  : serviceType === "para_llevar"
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-amber-500/20 border-amber-500/35 text-amber-300"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {serviceType === "domicilio" ? (
                  <Bike className="h-4 w-4 shrink-0 text-sky-400" />
                ) : serviceType === "para_llevar" ? (
                  <ShoppingBag className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Utensils className="h-4 w-4 shrink-0 text-amber-400" />
                )}
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider truncate">
                  {serviceType === "domicilio"
                    ? "A Domicilio"
                    : serviceType === "para_llevar"
                      ? "Para Llevar"
                      : formatServiceLabel(order.table)}
                </span>
              </div>

              {order.payments && order.payments.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider shrink-0">
                  Pagado Online
                </span>
              )}
            </div>
          );
        })()}

        {/* Card Header Info */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xl font-mono font-bold text-text-light tracking-tight">
              #{order.orderNumber}
            </h3>
            {order.customer?.name && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-light/90">
                <User className="h-3.5 w-3.5 text-text-light/50 shrink-0" />
                <span className="text-text-light/60 text-[11px]">Cliente:</span>
                <span className="font-semibold text-white truncate max-w-40">
                  {order.customer.name}
                </span>
              </div>
            )}
          </div>

          {/* Timer Badge */}
          <div
            className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 tabular-nums ${
              isOverdue &&
              order.status !== OrderStatus.DELIVERED &&
              order.status !== OrderStatus.READY
                ? "bg-rose-600 text-white shadow-xs ring-1 ring-rose-400/40"
                : "bg-card text-text-light border border-border"
            }`}
          >
            <Clock
              className={`h-3.5 w-3.5 ${isOverdue ? "animate-spin" : ""}`}
              style={{ animationDuration: "3s" }}
            />
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        {/* Order Items List */}
        <div className="mb-3 space-y-2">
          {activeItems.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              orderId={order.id}
              orderStatus={order.status}
              timerStartTime={timerStartTime}
              onItemReady={onItemReady}
              isUpdating={!!updatingItemIds?.has(item.id)}
            />
          ))}
        </div>

        {/* Order Level Notes */}
        {order.notes && (
          <div className="mb-3 rounded-lg border-l-3 border-amber-500 bg-amber-500/10 p-2.5">
            <div className="text-xs font-medium text-amber-300 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />{" "}
              <span>Nota de Orden: {order.notes}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {order.status === OrderStatus.PENDING && (
            <button
              onClick={() => onStatusChange(order.id, OrderStatus.PREPARING)}
              className="w-full min-h-10 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-dark uppercase tracking-wider hover:bg-amber-400 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Comenzar Preparación</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {order.status === OrderStatus.PREPARING && (
            <button
              onClick={() => onStatusChange(order.id, OrderStatus.READY)}
              disabled={!allReady}
              className="w-full min-h-10 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white uppercase tracking-wider hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Cerrar Orden</span>
            </button>
          )}

          {order.status === OrderStatus.READY && (
            <button
              onClick={() => onStatusChange(order.id, OrderStatus.DELIVERED)}
              className="w-full min-h-10 rounded-lg bg-card-light border border-border px-3 py-2 text-xs font-bold text-text-light uppercase tracking-wider hover:bg-card-light/80 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Marcar Entregado</span>
            </button>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.order !== nextProps.order) return false;
    if (prevProps.onStatusChange !== nextProps.onStatusChange) return false;
    if (prevProps.onItemReady !== nextProps.onItemReady) return false;

    const prevItems = prevProps.order.orderItems;
    const nextItems = nextProps.order.orderItems;

    if (prevItems.length !== nextItems.length) return false;

    for (let i = 0; i < prevItems.length; i++) {
      const prevUpdating = !!prevProps.updatingItemIds?.has(prevItems[i].id);
      const nextUpdating = !!nextProps.updatingItemIds?.has(nextItems[i].id);
      if (prevUpdating !== nextUpdating) return false;
    }

    return true;
  },
);

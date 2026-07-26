"use client";

import { OrderStatus, type OrderWithDetails } from "@/types";
import { useEffect, useState } from "react";
import { Clock, Check, Utensils, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

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
export function OrderCard({ order, onStatusChange, onItemReady, updatingItemIds }: OrderCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);

  const ALERT_THRESHOLD_MINUTES = 15;

  useEffect(() => {
    const calculateElapsed = () => {
      const now = new Date();
      const rawDate = order.createdAt as unknown as string;
      const createdAtStr = typeof rawDate === 'string' && !rawDate.endsWith('Z')
        ? `${rawDate}Z`
        : rawDate;

      const created = new Date(createdAtStr);
      const diffMs = Math.max(0, now.getTime() - created.getTime());

      const diffMinutes = Math.floor(diffMs / 1000 / 60);
      const diffSeconds = Math.floor((diffMs / 1000) % 60);

      setElapsedTime(diffMinutes * 60 + diffSeconds);
      setIsOverdue(diffMinutes >= ALERT_THRESHOLD_MINUTES);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [order.createdAt]);

  const getElapsedSeconds = (dateStr: any) => {
    if (!dateStr) return 0;
    const now = new Date();
    const rawDate = dateStr as unknown as string;
    const createdAtStr = typeof rawDate === 'string' && !rawDate.endsWith('Z')
      ? `${rawDate}Z`
      : rawDate;

    const created = new Date(createdAtStr);
    const diffMs = Math.max(0, now.getTime() - created.getTime());
    return Math.floor(diffMs / 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-black text-amber-400 uppercase tracking-widest">
            <Clock className="h-3 w-3" /> Pendiente
          </span>
        );
      case OrderStatus.PREPARING:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-[10px] font-black text-blue-400 uppercase tracking-widest">
            <Utensils className="h-3 w-3" /> En Preparación
          </span>
        );
      case OrderStatus.READY:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
            <CheckCircle2 className="h-3 w-3" /> Listo
          </span>
        );
      case OrderStatus.DELIVERED:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-black text-[#E0E0E0]/60 uppercase tracking-widest">
            Entregado
          </span>
        );
      default:
        return null;
    }
  };

  const allReady = order.orderItems
    .filter((item) => item.status !== OrderStatus.DELIVERED)
    .every((item) => item.status === OrderStatus.READY);

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-300 ${
        isOverdue &&
        order.status !== OrderStatus.DELIVERED &&
        order.status !== OrderStatus.READY
          ? "border-red-500/60 bg-[#3A1414] shadow-lg shadow-red-500/10"
          : "border-white/10 bg-[#181818] hover:border-white/20"
      }`}
    >
      {/* Card Header */}
      <div className="mb-4 flex items-start justify-between border-b border-white/5 pb-3">
        <div>
          <h3 className="text-2xl font-black text-[#E0E0E0] tracking-tight uppercase">
            #{order.orderNumber}
          </h3>
          {order.table && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary uppercase tracking-wider mt-0.5">
              <Utensils className="h-3.5 w-3.5" /> Mesa: {order.table}
            </span>
          )}
        </div>

        {/* Timer Badge */}
        <div
          className={`rounded-xl px-3.5 py-1.5 font-mono text-base font-black shadow-inner flex items-center gap-1.5 ${
            isOverdue
              ? "bg-red-500 text-white animate-pulse"
              : "bg-[#242424] text-[#E0E0E0] border border-white/5"
          }`}
        >
          <Clock className="h-4 w-4" />
          {formatTime(elapsedTime)}
        </div>
      </div>

      {/* Order Items List */}
      <div className="mb-4 space-y-2">
        {order.orderItems.filter((item) => item.status !== OrderStatus.DELIVERED).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-[#242424] p-3 transition-colors hover:border-white/10"
          >
            <div className="flex-1 pr-2">
              <p className="font-bold text-[#E0E0E0] text-sm">
                <span className="text-primary font-black mr-1">{item.quantity}x</span> {item.menuItem.name}
              </p>
              {item.notes && (
                <p className="mt-1 text-xs italic font-medium text-amber-400/90 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                  Nota: {item.notes}
                </p>
              )}
            </div>

            {order.status === OrderStatus.PREPARING && (
              <div className="flex flex-col items-end justify-center">
                {item.status === OrderStatus.READY ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    <Check className="h-3 w-3" /> LISTO
                  </span>
                ) : (
                  <button
                    onClick={() => onItemReady?.(order.id, item.id)}
                    disabled={updatingItemIds?.has(item.id)}
                    className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {updatingItemIds?.has(item.id) ? "..." : "Listo"}
                  </button>
                )}
                {item.preparationTimeSeconds != null ? (
                  <span className="mt-1 text-[10px] text-[#E0E0E0]/40 font-mono">
                    {formatTime(item.preparationTimeSeconds)}
                  </span>
                ) : item.status !== OrderStatus.READY && item.createdAt ? (
                  <span className="mt-1 text-[10px] text-[#E0E0E0]/40 font-mono">
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
          <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> Nota de Orden: {order.notes}
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
            className="w-full rounded-xl bg-primary px-4 py-3 text-xs font-black text-white uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            Comenzar Preparación <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {order.status === OrderStatus.PREPARING && (
          <button
            onClick={() => onStatusChange(order.id, OrderStatus.READY)}
            disabled={!allReady}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white uppercase tracking-wider hover:bg-emerald-500 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" /> Cerrar Orden
          </button>
        )}

        {order.status === OrderStatus.READY && (
          <button
            onClick={() => onStatusChange(order.id, OrderStatus.DELIVERED)}
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-xs font-black text-[#E0E0E0] uppercase tracking-wider hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            Marcar Entregado
          </button>
        )}
      </div>
    </div>
  );
}

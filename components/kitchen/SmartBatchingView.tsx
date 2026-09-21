"use client";

import type { BatchedMenuItem, OrderWithDetails } from "@/types";
import { useMemo } from "react";
import { Utensils } from "lucide-react";

interface SmartBatchingViewProps {
  orders: OrderWithDetails[];
}

/**
 * Smart Batching Component
 * Groups identical menu items across all active orders
 * Helps kitchen staff prepare items in batches for efficiency
 */
export function SmartBatchingView({ orders }: SmartBatchingViewProps) {
  const batchedItems = useMemo<BatchedMenuItem[]>(() => {
    const activeOrders = orders.filter(
      (order) =>
        order.status === "PENDING" ||
        order.status === "PREPARING" ||
        order.status === "READY",
    );

    const itemsMap = new Map<string, BatchedMenuItem>();

    activeOrders.forEach((order) => {
      order.orderItems.forEach((orderItem) => {
        const { menuItemId, menuItem, quantity } = orderItem;

        if (itemsMap.has(menuItemId)) {
          const existing = itemsMap.get(menuItemId)!;
          existing.totalQuantity += quantity;
          existing.orders.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            quantity,
          });
        } else {
          itemsMap.set(menuItemId, {
            menuItemId,
            menuItemName: menuItem.name,
            totalQuantity: quantity,
            orders: [
              {
                orderId: order.id,
                orderNumber: order.orderNumber,
                quantity,
              },
            ],
          });
        }
      });
    });

    return Array.from(itemsMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity,
    );
  }, [orders]);

  if (batchedItems.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center animate-in fade-in-0 duration-200">
        <p className="text-xs font-bold text-text-light/40 uppercase tracking-wider">
          No hay órdenes activas en este momento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-sm font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-secondary"></span>
          Resumen de Preparación en Lote (Smart Batching)
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {batchedItems.map((item) => (
          <div
            key={item.menuItemId}
            className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              {/* Item Header */}
              <div className="mb-3.5 flex items-center justify-between">
                <h3 className="text-base font-bold text-text-light uppercase tracking-tight flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-secondary" />
                  {item.menuItemName}
                </h3>
                <div className="rounded-lg bg-secondary/15 border border-secondary/30 px-3 py-1 text-center">
                  <span className="text-xl font-mono font-bold text-secondary tabular-nums">
                    {item.totalQuantity}{" "}
                    <span className="text-[10px] font-sans font-bold uppercase text-secondary/70">
                      total
                    </span>
                  </span>
                </div>
              </div>

              {/* Order Breakdown */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider mb-1.5">
                  Desglose por orden:
                </p>
                {item.orders.map((orderRef) => (
                  <div
                    key={orderRef.orderId}
                    className="flex items-center justify-between rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium border border-border"
                  >
                    <span className="text-text-light/80">
                      Orden #{orderRef.orderNumber}
                    </span>
                    <span className="font-mono font-bold text-secondary tabular-nums">
                      {orderRef.quantity}x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="mt-4 pt-2.5 border-t border-border flex items-center justify-between text-xs text-text-light/40 font-medium">
              <span>
                Presente en {item.orders.length}{" "}
                {item.orders.length === 1 ? "orden" : "órdenes"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

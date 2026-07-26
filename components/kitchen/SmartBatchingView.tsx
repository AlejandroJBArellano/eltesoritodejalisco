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
      <div className="rounded-2xl border border-white/5 bg-[#242424] p-12 text-center">
        <p className="text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
          No hay órdenes activas en este momento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-secondary"></span>
          Resumen de Preparación en Lote (Smart Batching)
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {batchedItems.map((item) => (
          <div
            key={item.menuItemId}
            className="rounded-2xl border border-white/10 bg-[#242424] p-6 shadow-sm hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Item Header */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-secondary" />
                  {item.menuItemName}
                </h3>
                <div className="rounded-xl bg-secondary/10 border border-secondary/20 px-4 py-2 text-center">
                  <span className="text-2xl font-black text-secondary">
                    {item.totalQuantity}{" "}
                    <span className="text-xs font-bold uppercase text-secondary/70">
                      total
                    </span>
                  </span>
                </div>
              </div>

              {/* Order Breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest mb-2">
                  Desglose por orden:
                </p>
                {item.orders.map((orderRef) => (
                  <div
                    key={orderRef.orderId}
                    className="flex items-center justify-between rounded-xl bg-[#181818] px-3.5 py-2 text-xs font-bold border border-white/5"
                  >
                    <span className="text-[#E0E0E0]/80">
                      Orden #{orderRef.orderNumber}
                    </span>
                    <span className="font-black text-secondary">
                      {orderRef.quantity}x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Summary */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#E0E0E0]/40 font-medium">
              <span>
                Presente en {item.orders.length} orden
                {item.orders.length !== 1 ? "es" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

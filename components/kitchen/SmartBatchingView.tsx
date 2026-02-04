"use client";

import type { BatchedMenuItem, OrderWithDetails } from "@/types";
import { useMemo } from "react";

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
    // Filter only active orders (not delivered/paid/cancelled)
    const activeOrders = orders.filter(
      (order) =>
        order.status === "PENDING" ||
        order.status === "PREPARING" ||
        order.status === "READY",
    );

    // Group items by menuItemId
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

    // Convert map to array and sort by total quantity (descending)
    return Array.from(itemsMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity,
    );
  }, [orders]);

  if (batchedItems.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p className="text-gray-500">No hay órdenes activas en este momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        Resumen de Preparación en Lote
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {batchedItems.map((item) => (
          <div
            key={item.menuItemId}
            className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 shadow-md"
          >
            {/* Item Header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {item.menuItemName}
              </h3>
              <div className="rounded-full bg-blue-600 px-4 py-2">
                <span className="text-2xl font-bold text-white">
                  {item.totalQuantity}
                </span>
              </div>
            </div>

            {/* Order Breakdown */}
            <div className="space-y-1">
              <p className="mb-2 text-sm font-semibold text-gray-700">
                Desglose por orden:
              </p>
              {item.orders.map((orderRef) => (
                <div
                  key={orderRef.orderId}
                  className="flex items-center justify-between rounded bg-white px-2 py-1 text-sm"
                >
                  <span className="font-medium text-gray-800">
                    #{orderRef.orderNumber}
                  </span>
                  <span className="font-semibold text-blue-600">
                    {orderRef.quantity}x
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-600">
                En {item.orders.length} orden
                {item.orders.length !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

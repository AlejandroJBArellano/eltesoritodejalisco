"use client";

import { useRealtimeOrders } from "@/hooks/useOrders";
import { OrderStatus, type OrderWithDetails } from "@/types";
import { useState } from "react";
import { OrderCard } from "./OrderCard";
import { SmartBatchingView } from "./SmartBatchingView";

interface KitchenDisplaySystemProps {
  initialOrders: OrderWithDetails[];
}

/**
 * Main Kitchen Display System (KDS) Component
 * Manages the full kitchen view with order cards and smart batching
 */
export function KitchenDisplaySystem({
  initialOrders,
}: KitchenDisplaySystemProps) {
  const { orders, setOrders } = useRealtimeOrders(initialOrders);
  const [view, setView] = useState<"kanban" | "batching">("kanban");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(
    () => new Set(),
  );

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    try {
      // Call API to update order status
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update order");

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: newStatus, updatedAt: new Date() }
            : order,
        ),
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Error al actualizar el estado de la orden");
    }
  };

  const handleItemReady = async (orderId: string, itemId: string) => {
    try {
      setUpdatingItemIds((prev) => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });

      const response = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: OrderStatus.READY }),
      });

      if (!response.ok) throw new Error("Failed to update item status");

      const data = await response.json();

      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.id !== orderId) return order;

          return {
            ...order,
            status: data.orderStatus,
            updatedAt: new Date(),
            orderItems: order.orderItems.map((item) =>
              item.id === itemId
                ? {
                  ...item,
                  status: data.item.status,
                  preparationTimeSeconds: data.item.preparationTimeSeconds ?? null,
                }
                : item,
            ),
          };
        }),
      );
    } catch (error) {
      console.error("Error updating item status:", error);
      alert("Error al actualizar el estado del artículo");
    } finally {
      setUpdatingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // Group orders by status for Kanban view
  const ordersByStatus = {
    pending: orders.filter((o) => o.status === OrderStatus.PENDING),
    preparing: orders.filter((o) => o.status === OrderStatus.PREPARING),
    ready: orders.filter((o) => o.status === OrderStatus.READY),
  };

  return (
    <div className="min-h-screen bg-[#121212] p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#E0E0E0]">
          {process.env.NEXT_PUBLIC_SYSTEM_NAME || "TesoritoOS"} - Sistema de Cocina
        </h1>

        {!soundEnabled && (
          <button
            onClick={() => setSoundEnabled(true)}
            className="rounded-lg border border-red-300 bg-red-100 px-4 py-2 font-bold text-red-700 shadow-md animate-pulse hover:bg-red-200 transition-colors"
          >
            🔔 Toca aquí para Activar Sonidos
          </button>
        )}

        {/* View Toggle */}
        <div className="flex gap-2 rounded-lg border border-[#333333] bg-[#242424] p-1">
          <button
            onClick={() => setView("kanban")}
            className={`rounded px-4 py-2 font-semibold transition-colors ${view === "kanban"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-[#121212]"
              }`}
          >
            Vista Kanban
          </button>
          <button
            onClick={() => setView("batching")}
            className={`rounded px-4 py-2 font-semibold transition-colors ${view === "batching"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-[#121212]"
              }`}
          >
            Vista de Lotes
          </button>
        </div>
      </div>

      {/* Main Content */}
      {view === "kanban" ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Pending Column */}
          <div className="rounded-lg bg-[#181818] p-4">
            <h2 className="mb-4 text-xl font-bold text-[#E0E0E0]">
              Pendientes ({ordersByStatus.pending.length})
            </h2>
            <div className="space-y-4">
              {ordersByStatus.pending.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onItemReady={handleItemReady}
                  updatingItemIds={updatingItemIds}
                />
              ))}
              {ordersByStatus.pending.length === 0 && (
                <p className="text-center text-gray-400">
                  No hay órdenes pendientes
                </p>
              )}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="rounded-lg bg-[#1A2634] p-4">
            <h2 className="mb-4 text-xl font-bold text-[#E0E0E0]">
              En Preparación ({ordersByStatus.preparing.length})
            </h2>
            <div className="space-y-4">
              {ordersByStatus.preparing.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onItemReady={handleItemReady}
                  updatingItemIds={updatingItemIds}
                />
              ))}
              {ordersByStatus.preparing.length === 0 && (
                <p className="text-center text-gray-400">
                  No hay órdenes en preparación
                </p>
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div className="rounded-lg bg-[#142A1D] p-4">
            <h2 className="mb-4 text-xl font-bold text-[#E0E0E0]">
              Listos ({ordersByStatus.ready.length})
            </h2>
            <div className="space-y-4">
              {ordersByStatus.ready.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onItemReady={handleItemReady}
                  updatingItemIds={updatingItemIds}
                />
              ))}
              {ordersByStatus.ready.length === 0 && (
                <p className="text-center text-gray-400">
                  No hay órdenes listas
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <SmartBatchingView orders={orders} />
      )}
    </div>
  );
}

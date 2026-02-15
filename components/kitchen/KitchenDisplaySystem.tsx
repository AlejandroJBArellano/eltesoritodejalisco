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

      // If order is completed, trigger inventory deduction
      if (newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.PAID) {
        await fetch(`/api/inventory/deduct`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Error al actualizar el estado de la orden");
    }
  };

  // Group orders by status for Kanban view
  const ordersByStatus = {
    pending: orders.filter((o) => o.status === OrderStatus.PENDING),
    preparing: orders.filter((o) => o.status === OrderStatus.PREPARING),
    ready: orders.filter((o) => o.status === OrderStatus.READY),
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          TesoritoOS - Sistema de Cocina
        </h1>

        {/* View Toggle */}
        <div className="flex gap-2 rounded-lg border border-gray-300 bg-white p-1">
          <button
            onClick={() => setView("kanban")}
            className={`rounded px-4 py-2 font-semibold transition-colors ${
              view === "kanban"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Vista Kanban
          </button>
          <button
            onClick={() => setView("batching")}
            className={`rounded px-4 py-2 font-semibold transition-colors ${
              view === "batching"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
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
          <div className="rounded-lg bg-gray-50 p-4">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Pendientes ({ordersByStatus.pending.length})
            </h2>
            <div className="space-y-4">
              {ordersByStatus.pending.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {ordersByStatus.pending.length === 0 && (
                <p className="text-center text-gray-500">
                  No hay órdenes pendientes
                </p>
              )}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="rounded-lg bg-blue-50 p-4">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              En Preparación ({ordersByStatus.preparing.length})
            </h2>
            <div className="space-y-4">
              {ordersByStatus.preparing.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {ordersByStatus.preparing.length === 0 && (
                <p className="text-center text-gray-500">
                  No hay órdenes en preparación
                </p>
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div className="rounded-lg bg-green-50 p-4">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Listos ({ordersByStatus.ready.length})
            </h2>
            <div className="space-y-4">
              {ordersByStatus.ready.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
              {ordersByStatus.ready.length === 0 && (
                <p className="text-center text-gray-500">
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

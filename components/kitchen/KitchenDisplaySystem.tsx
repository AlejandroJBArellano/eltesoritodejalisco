"use client";

import { useRealtimeOrders } from "@/hooks/useOrders";
import { OrderStatus, type OrderWithDetails } from "@/types";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BellRing, Bell, LayoutGrid, Layers, ChefHat, CheckCircle2, Clock } from "lucide-react";
import { OrderCard } from "./OrderCard";
import { SmartBatchingView } from "./SmartBatchingView";
import { PageHeader } from "@/components/PageHeader";

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
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update order");

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
    <div className="min-h-screen bg-[#121212]">
      {/* Header reutilizable */}
      <PageHeader
        title="KDS — Sistema de Cocina"
        subtitle="Pantalla de comandería en tiempo real y preparación por lotes"
        badgeColor="bg-purple-500"
        actions={
          <>
            {!soundEnabled ? (
              <button
                onClick={() => setSoundEnabled(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider animate-pulse hover:bg-red-500/30 transition-all active:scale-95 cursor-pointer"
              >
                <BellRing className="h-4 w-4" /> Activar Sonidos
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider">
                <Bell className="h-4 w-4" /> Sonidos Activos
              </span>
            )}

            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#181818] p-1">
              <button
                onClick={() => setView("kanban")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  view === "kanban"
                    ? "bg-primary text-black shadow-md shadow-primary/20"
                    : "text-[#E0E0E0]/60 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Vista Kanban
              </button>
              <button
                onClick={() => setView("batching")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  view === "batching"
                    ? "bg-primary text-black shadow-md shadow-primary/20"
                    : "text-[#E0E0E0]/60 hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Vista Lotes
              </button>
            </div>
          </>
        }
      />

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {view === "kanban" ? (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Pending Column */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-5">
                <h2 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  Pendientes
                </h2>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-400 uppercase tracking-widest border border-amber-500/20">
                  {ordersByStatus.pending.length}
                </span>
              </div>
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
                  <div className="py-12 text-center">
                    <p className="text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
                      No hay órdenes pendientes
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Preparing Column */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-5">
                <h2 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                  En Preparación
                </h2>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-400 uppercase tracking-widest border border-blue-500/20">
                  {ordersByStatus.preparing.length}
                </span>
              </div>
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
                  <div className="py-12 text-center">
                    <p className="text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
                      No hay órdenes en preparación
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Ready Column */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-5">
                <h2 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  Listos para Entregar
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
                  {ordersByStatus.ready.length}
                </span>
              </div>
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
                  <div className="py-12 text-center">
                    <p className="text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
                      No hay órdenes listas
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <SmartBatchingView orders={orders} />
        )}
      </div>
    </div>
  );
}

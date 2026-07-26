"use client";

import { useRealtimeOrders } from "@/hooks/useOrders";
import { OrderStatus, type OrderWithDetails } from "@/types";
import { useState } from "react";
import { BellRing, Bell, LayoutGrid, Layers, ChefHat, CheckCircle2, Clock, AlertCircle, X } from "lucide-react";
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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const { orders, setOrders } = useRealtimeOrders(initialOrders, soundEnabled);
  const [view, setView] = useState<"kanban" | "batching">("kanban");
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  const handleEnableSound = () => {
    setSoundEnabled(true);
    // Pre-unlock Audio Context via user gesture
    try {
      const testAudio = new Audio("/new_order.mp3");
      testAudio.volume = 0.1;
      testAudio.play().catch(() => {});
    } catch {
      // Ignore initial user gesture unlock error
    }
  };

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
      showToast("Error al actualizar el estado de la orden. Por favor reintenta.");
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
      showToast("Error al actualizar el platillo. Por favor reintenta.");
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
    <div className="min-h-screen bg-[#0f0f11] text-zinc-100 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-red-950/90 border border-red-500/50 p-4 text-xs font-bold text-red-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-red-400 hover:text-white p-1 rounded-lg hover:bg-red-900/50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header reutilizable */}
      <PageHeader
        title="KDS — Sistema de Cocina"
        subtitle="Pantalla de comandería en tiempo real y preparación por lotes"
        badgeColor="bg-amber-500"
        actions={
          <>
            {!soundEnabled ? (
              <button
                onClick={handleEnableSound}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-red-500/30 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <BellRing className="h-4 w-4 animate-bounce" /> Activar Sonidos
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-sm">
                <Bell className="h-4 w-4 text-emerald-400" /> Sonidos Activos
              </span>
            )}

            <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1 shadow-inner">
              <button
                onClick={() => setView("kanban")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  view === "kanban"
                    ? "bg-amber-500 text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <LayoutGrid className="h-4 w-4" /> Vista Kanban
              </button>
              <button
                onClick={() => setView("batching")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  view === "batching"
                    ? "bg-amber-500 text-zinc-950 shadow-md"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <Layers className="h-4 w-4" /> Vista Lotes
              </button>
            </div>
          </>
        }
      />

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        {view === "kanban" ? (
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {/* Pending Column */}
            <div className="rounded-2xl bg-zinc-900/80 p-5 shadow-lg border border-zinc-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
                <h2 className="text-base font-black text-zinc-100 uppercase tracking-tight flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                  Pendientes
                </h2>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-400 uppercase tracking-widest border border-amber-500/30">
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
                  <div className="py-14 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6">
                    <Clock className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                      Sin órdenes pendientes
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Las comandas recibidas aparecerán aquí
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Preparing Column */}
            <div className="rounded-2xl bg-zinc-900/80 p-5 shadow-lg border border-zinc-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
                <h2 className="text-base font-black text-zinc-100 uppercase tracking-tight flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                  En Preparación
                </h2>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-400 uppercase tracking-widest border border-blue-500/30">
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
                  <div className="py-14 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6">
                    <ChefHat className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                      Cocina despejada
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Inicia preparación en la columna pendiente
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Ready Column */}
            <div className="rounded-2xl bg-zinc-900/80 p-5 shadow-lg border border-zinc-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
                <h2 className="text-base font-black text-zinc-100 uppercase tracking-tight flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                  Listos para Entregar
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/30">
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
                  <div className="py-14 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                      Sin platillos por entregar
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Las órdenes terminadas se listarán aquí
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


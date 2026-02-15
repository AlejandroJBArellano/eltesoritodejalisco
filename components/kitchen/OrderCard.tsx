"use client";

import { OrderStatus, type OrderWithDetails } from "@/types";
import { useEffect, useState } from "react";

interface OrderCardProps {
  order: OrderWithDetails;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

/**
 * KDS Order Card Component
 * Displays order details with real-time timer and status management
 */
export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);

  const ALERT_THRESHOLD_MINUTES = 15;

  useEffect(() => {
    // Calculate elapsed time from order creation
    const calculateElapsed = () => {
      const now = new Date();
      const created = new Date(order.createdAt);
      const diffMs = now.getTime() - created.getTime();
      const diffMinutes = Math.floor(diffMs / 1000 / 60);
      const diffSeconds = Math.floor((diffMs / 1000) % 60);

      setElapsedTime(diffMinutes * 60 + diffSeconds);
      setIsOverdue(diffMinutes >= ALERT_THRESHOLD_MINUTES);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [order.createdAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PENDING:
        return "bg-yellow-500";
      case OrderStatus.PREPARING:
        return "bg-blue-500";
      case OrderStatus.READY:
        return "bg-green-500";
      case OrderStatus.DELIVERED:
        return "bg-gray-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: "Pendiente",
      [OrderStatus.PREPARING]: "En Preparación",
      [OrderStatus.READY]: "Listo",
      [OrderStatus.DELIVERED]: "Entregado",
      [OrderStatus.PAID]: "Pagado",
      [OrderStatus.CANCELLED]: "Cancelado",
    };
    return labels[status];
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 shadow-lg transition-all duration-300 ${
        isOverdue &&
        order.status !== OrderStatus.DELIVERED &&
        order.status !== OrderStatus.READY
          ? "border-red-500 bg-red-50"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            #{order.orderNumber}
          </h3>
          {order.table && (
            <p className="text-sm text-gray-600">Mesa: {order.table}</p>
          )}
        </div>

        {/* Timer */}
        <div
          className={`rounded-md px-3 py-2 text-center font-mono text-xl font-bold ${
            isOverdue ? "bg-red-600 text-white" : "bg-gray-200 text-gray-900"
          }`}
        >
          {formatTime(elapsedTime)}
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-4 space-y-2">
        {order.orderItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between rounded border border-gray-200 bg-gray-50 p-2"
          >
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {item.quantity}x {item.menuItem.name}
              </p>
              {item.notes && (
                <p className="mt-1 text-sm italic text-gray-600">
                  Nota: {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div className="mb-4 rounded border-l-4 border-orange-500 bg-orange-50 p-2">
          <p className="text-sm font-medium text-orange-900">
            Nota de la orden: {order.notes}
          </p>
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-3">
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-semibold text-white ${getStatusColor(
            order.status,
          )}`}
        >
          {getStatusLabel(order.status)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {order.status === OrderStatus.PENDING && (
          <button
            onClick={() => onStatusChange(order.id, OrderStatus.PREPARING)}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Comenzar
          </button>
        )}

        {order.status === OrderStatus.PREPARING && (
          <button
            onClick={() => onStatusChange(order.id, OrderStatus.READY)}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 transition-colors"
          >
            Marcar Listo
          </button>
        )}

        {order.status === OrderStatus.READY && (
          <button
            onClick={() => onStatusChange(order.id, OrderStatus.DELIVERED)}
            className="flex-1 rounded-md bg-gray-600 px-4 py-2 text-white font-semibold hover:bg-gray-700 transition-colors"
          >
            Entregar
          </button>
        )}
      </div>
    </div>
  );
}

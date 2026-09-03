"use client";

import React from "react";
import { Receipt, ShoppingBag, User } from "lucide-react";
import type { Order } from "./types";

export interface OrderDetailExpandedProps {
  order: Order;
  onBillOrder: (order: Order) => void;
}

export function OrderDetailExpanded({
  order,
  onBillOrder,
}: OrderDetailExpandedProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h4 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
            Detalle de la Orden #{order.orderNumber}
          </h4>
          {order.customer && (
            <span className="text-xs text-text-light/70 font-medium flex items-center gap-1">
              <User className="h-3 w-3 text-text-light/40" />
              {order.customer.name}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBillOrder(order);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-[10px] font-black text-blue-400 hover:bg-blue-500/20 transition-all uppercase tracking-wider cursor-pointer"
        >
          <Receipt className="h-3.5 w-3.5" /> Facturar Orden
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] font-bold text-text-light/40 border-b border-border">
              <th className="pb-1 text-left">Producto</th>
              <th className="pb-1 text-center">Cant.</th>
              <th className="pb-1 text-right">P. Unit</th>
              <th className="pb-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.orderItems?.map((item) => {
              const unitPrice = Number(item.unitPrice || 0);
              const subtotal = item.quantity * unitPrice;
              return (
                <tr key={item.id}>
                  <td className="py-1.5 font-bold text-text-light">
                    {item.menuItem?.name || "Producto"}
                    {item.notes && (
                      <span className="text-[10px] text-amber-400/80 block font-normal">
                        Notas: {item.notes}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-center font-mono">
                    {item.quantity}
                  </td>
                  <td className="py-1.5 text-right font-mono text-text-light/60">
                    ${unitPrice.toFixed(2)}
                  </td>
                  <td className="py-1.5 text-right font-mono font-bold text-text-light">
                    ${subtotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {order.notes && (
        <div className="pt-2 border-t border-border text-[11px] text-text-light/60">
          <span className="font-bold text-text-light/80">Notas generales: </span>
          {order.notes}
        </div>
      )}
    </div>
  );
}

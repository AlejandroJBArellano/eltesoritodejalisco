"use client";

import React from "react";
import {
  ChevronDown,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import {
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";
import {
  getOrderPaymentLabel,
  getOrderPaymentMethods,
  getOrderTipAmount,
} from "@/components/pos/paymentUtils";
import { useHistoryContextNullable } from "./HistoryContext";
import { OrderDetailExpanded } from "./OrderDetailExpanded";
import type { Order, OrderSortField } from "./types";

export interface OrdersHistoryTableProps {
  orders?: Order[];
  sortField?: OrderSortField;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalItems?: number;
  expandedRow?: string | null;
  onSort?: (field: OrderSortField) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onToggleRow?: (orderId: string) => void;
  onBillOrder?: (order: Order) => void;
}

export function OrdersHistoryTable(props: OrdersHistoryTableProps = {}) {
  const context = useHistoryContextNullable();

  const orders = props.orders ?? context?.paginatedOrders ?? [];
  const sortField = props.sortField ?? context?.ordersSortField ?? "createdAt";
  const sortDir = props.sortDir ?? context?.ordersSortDir ?? "desc";
  const page = props.page ?? context?.ordersPage ?? 1;
  const pageSize = props.pageSize ?? context?.ordersPageSize ?? 10;
  const totalPages = props.totalPages ?? context?.ordersTotalPages ?? 1;
  const totalItems = props.totalItems ?? context?.ordersTotalItems ?? 0;
  const expandedRow = props.expandedRow !== undefined ? props.expandedRow : (context?.expandedRow ?? null);

  const onSort = props.onSort ?? ((field) => {
    if (context) {
      context.setOrdersSortField(field);
      context.setOrdersSortDir(context.ordersSortDir === "asc" ? "desc" : "asc");
    }
  });
  const onPageChange = props.onPageChange ?? context?.setOrdersPage ?? (() => {});
  const onPageSizeChange = props.onPageSizeChange ?? context?.setOrdersPageSize ?? (() => {});
  const onToggleRow = props.onToggleRow ?? context?.toggleRow ?? (() => {});
  const onBillOrder = props.onBillOrder ?? context?.setBillingOrder ?? (() => {});

  return (
    <div className="overflow-x-auto space-y-4">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
            <TableHeaderSortCell
              field="orderNumber"
              label="Folio"
              currentSortField={sortField}
              sortDirection={sortDir}
              onSort={onSort}
            />
            <TableHeaderSortCell
              field="createdAt"
              label="Fecha"
              currentSortField={sortField}
              sortDirection={sortDir}
              onSort={onSort}
            />
            <TableHeaderSortCell
              field="table"
              label="Mesa"
              currentSortField={sortField}
              sortDirection={sortDir}
              onSort={onSort}
            />
            <th className="py-3 px-3">Método</th>
            <th className="py-3 px-3 text-right">Subtotal</th>
            <th className="py-3 px-3 text-right">IVA (16%)</th>
            <th className="py-3 px-3 text-right">Propina</th>
            <TableHeaderSortCell
              field="total"
              label="TOTAL PAGO"
              currentSortField={sortField}
              sortDirection={sortDir}
              onSort={onSort}
              className="text-right text-primary"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => {
            const tipAmount = getOrderTipAmount(order);
            const paymentMethods = getOrderPaymentMethods(order);
            const primaryPaymentMethod = paymentMethods[0] || "N/A";

            const subtotalFiscal = order.total / 1.16;
            const ivaFiscal = order.total - subtotalFiscal;
            const totalPago = order.total + tipAmount;

            let methodLabel = getOrderPaymentLabel(order);
            let methodBadgeClass =
              "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

            if (order.status === "UNCOLLECTED") {
              methodLabel = "NO COBRADA";
              methodBadgeClass =
                "bg-red-500/10 text-red-400 border-red-500/20";
            } else if (
              primaryPaymentMethod === "CARD" ||
              primaryPaymentMethod === "TRANSFER"
            ) {
              methodBadgeClass =
                "bg-blue-500/10 text-blue-400 border-blue-500/20";
            } else if (paymentMethods.length > 1) {
              methodBadgeClass =
                "bg-purple-500/10 text-purple-300 border-purple-500/20";
            }

            const isExpanded = expandedRow === order.id;

            return (
              <React.Fragment key={order.id}>
                <tr
                  className="hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => onToggleRow(order.id)}
                  data-testid={`order-row-${order.id}`}
                >
                  <td className="py-3.5 px-3 font-mono font-black text-sm text-text-light">
                    <div className="flex items-center gap-2">
                      <span className="text-text-light/40">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      #{order.orderNumber}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-text-light/80 font-medium">
                    {new Date(order.createdAt).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Mexico_City",
                    })}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black text-text-light/70 uppercase tracking-wider">
                        {order.table || "Para Llevar"}
                      </span>
                      {order.source === "PICKUP_APP" && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <ShoppingBag className="h-2.5 w-2.5" />
                          Pickup
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${methodBadgeClass}`}
                    >
                      {methodLabel}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-text-light/70">
                    ${subtotalFiscal.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-amber-400/80">
                    ${ivaFiscal.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-blue-400">
                    ${tipAmount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-black text-text-light text-sm">
                    ${totalPago.toFixed(2)}
                  </td>
                </tr>

                {/* FILA EXPANDIDA */}
                {isExpanded && (
                  <tr className="bg-dark/40" data-testid={`order-expanded-${order.id}`}>
                    <td colSpan={8} className="px-6 py-4">
                      <OrderDetailExpanded
                        order={order}
                        onBillOrder={onBillOrder}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}

          {orders.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-8 text-center text-text-light/40 italic"
              >
                No se encontraron órdenes que coincidan con los filtros
                seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

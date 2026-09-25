import { getOrderTipAmount } from "@/components/pos/paymentUtils";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { useOptionalUser } from "@/components/UserProvider";
import {
  Ban,
  Bike,
  ChefHat,
  DollarSign,
  Edit3,
  HandCoins,
  Plus,
  Printer,
  ShoppingBag,
  Undo2,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatServiceLabel, getServiceType } from "@/lib/utils/serviceType";
import { POSManagerAuthModal } from "./modals/POSManagerAuthModal";
import { TablePagination } from "@/components/ui/DataTableControls";
import type { Order } from "@/types";

export default function OrdersPOS({
  onClickCancel,
  cancelArmedId,
}: {
  onClickCancel: (orderId: string) => void;
  cancelArmedId: string | null;
}) {
  const user = useOptionalUser();
  const isWaiter = user?.isWaiter ?? false;
  const [undoOrder, setUndoOrder] = useState<Order | null>(null);

  const { refreshOrders, availableMenuItems, orders } = usePOSData();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PAID">(
    "ALL",
  );
  const [sourceFilter, setSourceFilter] = useState<
    "ALL" | "POS" | "PICKUP_APP"
  >("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sourceFilter]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status !== "PAID").length,
    [orders],
  );
  const paidCount = useMemo(
    () => orders.filter((o) => o.status === "PAID").length,
    [orders],
  );
  const pickupCount = useMemo(
    () => orders.filter((o) => o.source === "PICKUP_APP").length,
    [orders],
  );
  const posCount = useMemo(
    () => orders.filter((o) => o.source !== "PICKUP_APP").length,
    [orders],
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === "PENDING" && o.status === "PAID") return false;
      if (statusFilter === "PAID" && o.status !== "PAID") return false;

      if (sourceFilter === "POS" && o.source === "PICKUP_APP") return false;
      if (sourceFilter === "PICKUP_APP" && o.source !== "PICKUP_APP")
        return false;

      return true;
    });
  }, [orders, statusFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const emptyMessage = useMemo(() => {
    let statusLabel = "órdenes";
    if (statusFilter === "PENDING") statusLabel = "órdenes pendientes";
    if (statusFilter === "PAID") statusLabel = "órdenes pagadas";

    let sourceLabel = "";
    if (sourceFilter === "PICKUP_APP") sourceLabel = " de Kittn Pickup";
    if (sourceFilter === "POS") sourceLabel = " de POS";

    return `No hay ${statusLabel}${sourceLabel} todavía`;
  }, [statusFilter, sourceFilter]);

  const { isSubmittingCart, setEditingOrder, openModifyModal } = usePOSCart(
    availableMenuItems,
    refreshOrders,
  );
  const {
    isSubmittingCheckout,
    setCheckoutOrder,
    setPaymentMethod,
    setReceivedAmount,
    setShowTicket,
    setShowKitchenTicket,
    setTipType,
    setTipInput,
    setEditingTipOrder,
    setEditTipType,
    setEditTipInput,
    handleUndoPayment,
  } = usePOSCheckout(refreshOrders);

  return (
    <div className="hidden md:block space-y-3">
      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs: Pendientes / Pagadas / Todas */}
        <div className="flex items-center gap-1.5 bg-dark/40 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-card text-text-light border border-border/80 shadow-sm"
                : "text-text-light/50 hover:text-text-light"
            }`}
          >
            <span>Todas</span>
            <span className="text-[10px] opacity-70 font-mono font-bold">
              ({orders.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "PENDING"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-text-light/50 hover:text-amber-400"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            <span>Pendientes</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                statusFilter === "PENDING"
                  ? "bg-amber-500/30 text-amber-200"
                  : "bg-card-light/60 text-text-light/60"
              }`}
            >
              {pendingCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PAID")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "PAID"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-text-light/50 hover:text-emerald-400"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>Pagadas</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                statusFilter === "PAID"
                  ? "bg-emerald-500/30 text-emerald-200"
                  : "bg-card-light/60 text-text-light/60"
              }`}
            >
              {paidCount}
            </span>
          </button>
        </div>

        {/* Source Filter: Todos / POS Directo / Kittn Pickup */}
        <div className="flex items-center gap-1.5 bg-dark/40 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setSourceFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              sourceFilter === "ALL"
                ? "bg-card text-text-light border border-border/80 shadow-sm"
                : "text-text-light/50 hover:text-text-light"
            }`}
          >
            Todos ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("POS")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sourceFilter === "POS"
                ? "bg-card text-text-light border border-border/80 shadow-sm"
                : "text-text-light/50 hover:text-text-light"
            }`}
          >
            <span>🍽️ POS Directo</span>
            <span className="text-[10px] opacity-70 font-mono font-bold">
              ({posCount})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("PICKUP_APP")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sourceFilter === "PICKUP_APP"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-text-light/50 hover:text-emerald-400"
            }`}
          >
            <ShoppingBag className="h-3 w-3" />
            <span>Kittn Pickup</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              {pickupCount}
            </span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 px-3 text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                Folio
              </th>
              <th className="pb-3 px-3 text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                Mesa / Origen
              </th>
              <th className="pb-3 px-3 text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                Estado
              </th>
              <th className="pb-3 px-3 text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                Total
              </th>
              <th className="pb-3 px-3 text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-text-light/30">
                    {emptyMessage}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const tipAmt = getOrderTipAmount(order);
                const isUndoable = (() => {
                  const lastUpdate = new Date(
                    order.updatedAt || order.createdAt,
                  ).getTime();
                  const now = new Date().getTime();
                  return now - lastUpdate < 3 * 60 * 1000;
                })();

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-card-light/20 transition-colors"
                  >
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-black text-sm text-text-light">
                        #{order.orderNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getServiceType(order.table) === "domicilio" ? (
                          <span className="rounded-full bg-dark/40 border border-secondary/30 px-2.5 py-1 text-[10px] font-black text-secondary uppercase tracking-wider flex items-center gap-1">
                            <Bike className="h-2.5 w-2.5" />
                            {formatServiceLabel(order.table)}
                          </span>
                        ) : getServiceType(order.table) === "para_llevar" ? (
                          <span className="rounded-full bg-card-light border border-border px-2.5 py-1 text-[10px] font-black text-text-light/70 uppercase tracking-wider flex items-center gap-1">
                            <ShoppingBag className="h-2.5 w-2.5" />
                            {formatServiceLabel(order.table)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <Utensils className="h-2.5 w-2.5" />
                            {formatServiceLabel(order.table)}
                          </span>
                        )}
                        {order.source === "PICKUP_APP" && (
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <ShoppingBag className="h-2.5 w-2.5" />
                            Pickup
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      {order.status === "PAID" ? (
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-black text-success uppercase tracking-widest">
                          Pagado
                        </span>
                      ) : order.status === "UNCOLLECTED" ? (
                        <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-black text-red-400 uppercase tracking-widest">
                          No Cobrada
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-text-light tabular-nums">
                          ${order.total.toFixed(2)}
                        </span>
                        {!isWaiter && tipAmt > 0 && (
                          <span className="text-[10px] font-bold text-primary font-mono tabular-nums">
                            +${tipAmt.toFixed(2)} propina
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex justify-end items-center gap-1.5 flex-wrap">
                        {order.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => {
                              setCheckoutOrder(order);
                              setShowTicket(false);
                              setShowKitchenTicket(false);
                              setTipType("NONE");
                              setTipInput("");
                              setPaymentMethod("CASH");
                              setReceivedAmount("");
                            }}
                            className="rounded-lg bg-success/15 hover:bg-success/25 text-success border border-success/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.98]"
                          >
                            <DollarSign className="h-3 w-3" />
                            Cobrar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutOrder(order);
                            setShowKitchenTicket(true);
                            setShowTicket(false);
                          }}
                          className="rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.98]"
                        >
                          <ChefHat className="h-3 w-3" />
                          Comanda
                        </button>
                        {order.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => setEditingOrder(order)}
                            className="rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.98]"
                          >
                            <Plus className="h-3 w-3" />
                            Agregar
                          </button>
                        )}
                        {order.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => openModifyModal(order)}
                            className="rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.98]"
                          >
                            <Edit3 className="h-3 w-3" />
                            Editar
                          </button>
                        )}
                        {order.status === "PAID" && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTipOrder(order);
                              setEditTipType("FIXED");
                              setEditTipInput(
                                order.payments?.[0]?.tipAmount?.toString() ||
                                  "0",
                              );
                            }}
                            className="rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.98]"
                          >
                            <HandCoins className="h-3 w-3" />
                            Propina
                          </button>
                        )}
                        {order.status === "PAID" && isUndoable && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isWaiter) {
                                setUndoOrder(order);
                              } else {
                                handleUndoPayment(order.id);
                              }
                            }}
                            className="rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                            title="Revertir pago (ventana de 3 min)"
                          >
                            <Undo2 className="h-3 w-3" />
                            Deshacer{" "}
                            <span className="opacity-60 normal-case font-bold">
                              (3 min)
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutOrder(order);
                            setShowTicket(true);
                            setShowKitchenTicket(false);
                          }}
                          className="rounded-lg bg-card-light hover:bg-card-light/80 text-text-light/70 border border-border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Printer className="h-3 w-3" />
                          Ticket
                        </button>
                        {order.status !== "PAID" &&
                          order.status !== "UNCOLLECTED" && (
                            <button
                              type="button"
                              onClick={() => onClickCancel(order.id)}
                              disabled={
                                isSubmittingCart || isSubmittingCheckout
                              }
                              className={`rounded-lg p-1.5 text-[11px] font-bold uppercase transition-all disabled:opacity-50 cursor-pointer ${
                                cancelArmedId === order.id
                                  ? "bg-red-500/30 border border-red-500/50 text-red-300 px-2.5"
                                  : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                              }`}
                              title={
                                cancelArmedId === order.id
                                  ? "Confirmar cancelación"
                                  : "Cancelar orden"
                              }
                            >
                              {cancelArmedId === order.id ? (
                                "¿Seguro?"
                              ) : (
                                <Ban className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredOrders.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      )}

      <POSManagerAuthModal
        isOpen={!!undoOrder}
        onClose={() => setUndoOrder(null)}
        title="Autorizar Reapertura de Cuenta"
        description={
          undoOrder
            ? `Reabrir la orden #${undoOrder.orderNumber} revertirá el cobro y la dejará como pendiente. Requiere PIN de Gerencia.`
            : ""
        }
        reasonPresets={[
          "Error de cobro",
          "Cambio de forma de pago",
          "Cliente solicitó producto extra",
          "Cancelación de cuenta",
        ]}
        onAuthorize={async ({ pin, reason }) => {
          if (undoOrder) {
            await handleUndoPayment(undoOrder.id, pin, reason);
          }
        }}
        isSubmitting={isSubmittingCheckout}
      />
    </div>
  );
}

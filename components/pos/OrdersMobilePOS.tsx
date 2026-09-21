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
import { useMemo, useState } from "react";
import { formatServiceLabel, getServiceType } from "@/lib/utils/serviceType";
import { POSManagerAuthModal } from "./modals/POSManagerAuthModal";
import type { Order } from "@/types";

export default function OrdersMobileFunction({
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

      if (sourceFilter === "POS") return o.source !== "PICKUP_APP";
      if (sourceFilter === "PICKUP_APP") return o.source === "PICKUP_APP";
      return true;
    });
  }, [orders, statusFilter, sourceFilter]);

  const emptyMessage = useMemo(() => {
    let statusLabel = "órdenes";
    if (statusFilter === "PENDING") statusLabel = "órdenes pendientes";
    if (statusFilter === "PAID") statusLabel = "órdenes pagadas";

    let sourceLabel = "";
    if (sourceFilter === "PICKUP_APP") sourceLabel = " de Kittn Pickup";
    if (sourceFilter === "POS") sourceLabel = " de POS";

    return `No hay ${statusLabel}${sourceLabel}`;
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
    <div className="md:hidden space-y-3 pt-4">
      {/* Pestañas de Estado: Todas / Pendientes / Pagadas */}
      <div className="flex items-center gap-1 bg-dark/40 p-1 rounded-xl border border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-[0.98] ${
            statusFilter === "ALL"
              ? "bg-card text-text-light border border-border shadow-sm"
              : "text-text-light/50 hover:text-text-light"
          }`}
        >
          Todas ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("PENDING")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
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
                : "bg-dark/40 text-text-light/60"
            }`}
          >
            {pendingCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("PAID")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
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
                : "bg-dark/40 text-text-light/60"
            }`}
          >
            {paidCount}
          </span>
        </button>
      </div>

      {/* Filtro de Origen: Todos / POS / Pickup */}
      <div className="flex items-center gap-1 bg-dark/40 p-1 rounded-xl border border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setSourceFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-[0.98] ${
            sourceFilter === "ALL"
              ? "bg-card text-text-light border border-border shadow-sm"
              : "text-text-light/50 hover:text-text-light"
          }`}
        >
          Todos ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setSourceFilter("POS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer active:scale-[0.98] ${
            sourceFilter === "POS"
              ? "bg-card text-text-light border border-border shadow-sm"
              : "text-text-light/50 hover:text-text-light"
          }`}
        >
          <span>POS ({posCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setSourceFilter("PICKUP_APP")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer active:scale-[0.98] ${
            sourceFilter === "PICKUP_APP"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-text-light/50 hover:text-emerald-400"
          }`}
        >
          <ShoppingBag className="h-3 w-3" />
          <span>Pickup ({pickupCount})</span>
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center bg-card rounded-xl border border-dashed border-border p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-text-light/40">
            {emptyMessage}
          </p>
        </div>
      ) : (
        filteredOrders.slice(0, 10).map((order) => {
          const tipAmt = getOrderTipAmount(order);
          const isUndoable = (() => {
            const lastUpdate = new Date(
              order.updatedAt || order.createdAt,
            ).getTime();
            const now = new Date().getTime();
            return now - lastUpdate < 3 * 60 * 1000;
          })();

          return (
            <div
              key={order.id}
              className="bg-card rounded-xl p-3.5 border border-border space-y-3"
            >
              {/* Header de la tarjeta */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono font-bold text-sm text-text-light">
                    #{order.orderNumber}
                  </p>
                  <p className="text-[10px] font-mono text-text-light/50 mt-0.5">
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {getServiceType(order.table) === "domicilio" ? (
                    <span className="rounded-md bg-dark/40 border border-border px-2 py-0.5 text-[10px] font-bold text-text-light/80 uppercase tracking-wider flex items-center gap-1">
                      <Bike className="h-2.5 w-2.5" />
                      {formatServiceLabel(order.table)}
                    </span>
                  ) : getServiceType(order.table) === "para_llevar" ? (
                    <span className="rounded-md bg-card border border-border px-2 py-0.5 text-[10px] font-bold text-text-light/70 uppercase tracking-wider flex items-center gap-1">
                      <ShoppingBag className="h-2.5 w-2.5" />
                      {formatServiceLabel(order.table)}
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Utensils className="h-2.5 w-2.5" />
                      {formatServiceLabel(order.table)}
                    </span>
                  )}
                  {order.source === "PICKUP_APP" && (
                    <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <ShoppingBag className="h-2.5 w-2.5" />
                      Pickup
                    </span>
                  )}
                  {order.status === "PAID" ? (
                    <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Pagado
                    </span>
                  ) : order.status === "UNCOLLECTED" ? (
                    <span className="rounded-md bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                      No Cobrada
                    </span>
                  ) : (
                    <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>

              {/* Detalle de Total */}
              <div className="flex justify-between items-center bg-dark/40 p-2.5 rounded-lg border border-border font-mono">
                <span className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider">
                  Total
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-text-light tabular-nums">
                    ${order.total.toFixed(2)}
                  </span>
                  {!isWaiter && tipAmt > 0 && (
                    <p className="text-[10px] font-mono font-bold text-primary leading-none mt-0.5 tabular-nums">
                      +${tipAmt.toFixed(2)} propina
                    </p>
                  )}
                </div>
              </div>

              {/* Grid de Botones de Acción */}
              <div className="grid grid-cols-2 gap-2 pt-1">
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
                    className={`${
                      order.status === "UNCOLLECTED" ? "col-span-2" : ""
                    } rounded-lg bg-primary text-background py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] shadow-sm`}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
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
                  className="rounded-lg bg-dark/40 hover:bg-dark/40 text-text-light border border-border py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <ChefHat className="h-3.5 w-3.5" />
                  Comanda
                </button>
                {order.status !== "PAID" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingOrder(order)}
                      className="rounded-lg bg-dark/40 hover:bg-dark/40 text-text-light border border-border py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => openModifyModal(order)}
                      className="rounded-lg bg-dark/40 hover:bg-dark/40 text-text-light border border-border py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTipOrder(order);
                        setEditTipType("FIXED");
                        setEditTipInput(
                          order.payments?.[0]?.tipAmount?.toString() || "0",
                        );
                      }}
                      className="rounded-lg bg-dark/40 hover:bg-dark/40 text-text-light border border-border py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
                    >
                      <HandCoins className="h-3.5 w-3.5" />
                      Propina
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutOrder(order);
                    setShowTicket(true);
                    setShowKitchenTicket(false);
                  }}
                  className="rounded-lg bg-dark/40 hover:bg-dark/40 text-text-light border border-border py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Ticket
                </button>
                {order.status !== "PAID" && order.status !== "UNCOLLECTED" && (
                  <button
                    type="button"
                    onClick={() => {
                      onClickCancel(order.id);
                    }}
                    disabled={isSubmittingCart || isSubmittingCheckout}
                    className={`rounded-lg py-2 text-[11px] font-bold uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                      cancelArmedId === order.id
                        ? "bg-red-500/30 border border-red-500/50 text-red-300 px-2"
                        : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {cancelArmedId === order.id ? (
                      "¿Seguro?"
                    ) : (
                      <>
                        <Ban className="h-3.5 w-3.5" /> Cancelar
                      </>
                    )}
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
                    className="col-span-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Deshacer Pago
                  </button>
                )}
              </div>
            </div>
          );
        })
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

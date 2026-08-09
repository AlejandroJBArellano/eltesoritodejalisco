import { getOrderTipAmount } from "@/components/pos/paymentUtils";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { Ban, ChefHat, DollarSign, Edit3, HandCoins, Plus, Printer, Undo2 } from "lucide-react";
import NoOrdersPOS from "./NoOrdersPOS";

export default function OrdersMobileFunction({ onClickCancel, cancelArmedId }: {
    onClickCancel: (orderId: string) => void;
    cancelArmedId: string | null
}) {
    const { refreshOrders, availableMenuItems, orders } = usePOSData()
    const { isSubmittingCart, setEditingOrder, openModifyModal } = usePOSCart(availableMenuItems, refreshOrders)
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
        setBillingOrder,
        handleUndoPayment,
    } = usePOSCheckout(refreshOrders);
    return <div className="md:hidden space-y-4 pt-4">
        {orders.length === 0 ? (
            <NoOrdersPOS />
        ) : (
            orders.slice(0, 10).map((order) => {
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
                        className="bg-card-light rounded-2xl p-4 border border-border space-y-4"
                    >
                        {/* Header de la tarjeta */}
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-mono font-black text-sm text-text-light">
                                    #{order.orderNumber}
                                </p>
                                <p className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider mt-0.5">
                                    {new Date(order.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className="rounded-full bg-card border border-border px-2.5 py-1 text-[10px] font-black text-text-light/70 uppercase tracking-wider">
                                    {order.table || "Para Llevar"}
                                </span>
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
                            </div>
                        </div>

                        {/* Detalle de Total */}
                        <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
                            <span className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                                Total
                            </span>
                            <div className="text-right">
                                <span className="font-black text-sm text-text-light tabular-nums">
                                    ${order.total.toFixed(2)}
                                </span>
                                {tipAmt > 0 && (
                                    <p className="text-[10px] font-bold text-blue-400/80 leading-none mt-0.5">
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
                                    className={`${order.status === "UNCOLLECTED" ? "col-span-2" : ""
                                        } rounded-xl bg-success/10 hover:bg-success/20 text-success border border-success/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors`}
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
                                className="rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <ChefHat className="h-3.5 w-3.5" />
                                Comanda
                            </button>
                            {order.status !== "PAID" && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setEditingOrder(order)}
                                        className="rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Agregar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openModifyModal(order)}
                                        className="rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
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
                                        className="rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <HandCoins className="h-3.5 w-3.5" />
                                        Propina
                                    </button>
                                    {/* <button
                                        type="button"
                                        onClick={() => setBillingOrder(order)}
                                        className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        Factura
                                    </button> */}
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setCheckoutOrder(order);
                                    setShowTicket(true);
                                    setShowKitchenTicket(false);
                                }}
                                className="rounded-xl bg-card hover:bg-card/80 text-text-light/70 border border-border py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Ticket
                            </button>
                            {order.status !== "PAID" &&
                                order.status !== "UNCOLLECTED" && (
                                    <button
                                        type="button"
                                        onClick={() => { onClickCancel(order.id) }
                                        }
                                        disabled={isSubmittingCart || isSubmittingCheckout}
                                        className={`rounded-xl py-2.5 text-[10px] font-black uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${cancelArmedId === order.id
                                            ? "bg-red-500/30 border border-red-500/50 text-red-300"
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
                                    onClick={() => handleUndoPayment(order.id)}
                                    className="col-span-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
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
    </div>
}
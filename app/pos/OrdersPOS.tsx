import { getOrderTipAmount } from "@/components/pos/paymentUtils";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { Ban, ChefHat, DollarSign, Edit3, FileText, HandCoins, Plus, Printer, Undo2 } from "lucide-react";


export default function OrdersPOS({ onClickCancel, cancelArmedId }: {
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
    return <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
            <thead>
                <tr className="border-b border-border">
                    <th className="pb-3 px-3 text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                        Folio
                    </th>
                    <th className="pb-3 px-3 text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                        Mesa / Tipo
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
                {orders.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="py-16 text-center">
                            <p className="text-xs font-extrabold uppercase tracking-widest text-text-light/30">
                                No hay órdenes todavía
                            </p>
                        </td>
                    </tr>
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
                                    <span className="rounded-full bg-card-light border border-border px-2.5 py-1 text-[10px] font-black text-text-light/70 uppercase tracking-wider">
                                        {order.table || "Para Llevar"}
                                    </span>
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
                                        {tipAmt > 0 && (
                                            <span className="text-[10px] font-bold text-blue-400/80">
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
                                                className="rounded-xl bg-success/10 hover:bg-success/20 text-success border border-success/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
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
                                            className="rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                                        >
                                            <ChefHat className="h-3 w-3" />
                                            Comanda
                                        </button>
                                        {order.status !== "PAID" && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingOrder(order)}
                                                className="rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Agregar
                                            </button>
                                        )}
                                        {order.status !== "PAID" && (
                                            <button
                                                type="button"
                                                onClick={() => openModifyModal(order)}
                                                className="rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
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
                                                className="rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                                            >
                                                <HandCoins className="h-3 w-3" />
                                                Propina
                                            </button>
                                        )}
                                        {order.status === "PAID" && isUndoable && (
                                            <button
                                                type="button"
                                                onClick={() => handleUndoPayment(order.id)}
                                                className="rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                                                title="Revertir pago (ventana de 3 min)"
                                            >
                                                <Undo2 className="h-3 w-3" />
                                                Deshacer{" "}
                                                <span className="opacity-60 normal-case font-bold">
                                                    (3 min)
                                                </span>
                                            </button>
                                        )}
                                        {order.status === "PAID" && (
                                            <button
                                                type="button"
                                                onClick={() => setBillingOrder(order)}
                                                className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                                            >
                                                <FileText className="h-3 w-3" />
                                                Factura
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCheckoutOrder(order);
                                                setShowTicket(true);
                                                setShowKitchenTicket(false);
                                            }}
                                            className="rounded-xl bg-card-light hover:bg-card-light/80 text-text-light/70 border border-border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                                        >
                                            <Printer className="h-3 w-3" />
                                            Ticket
                                        </button>
                                        {order.status !== "PAID" &&
                                            order.status !== "UNCOLLECTED" && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onClickCancel(order.id)
                                                    }
                                                    disabled={
                                                        isSubmittingCart || isSubmittingCheckout
                                                    }
                                                    className={`rounded-xl p-1 text-[10px] font-black uppercase transition-all disabled:opacity-50 ${cancelArmedId === order.id
                                                        ? "bg-red-500/30 border border-red-500/50 text-red-300 px-2"
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
}
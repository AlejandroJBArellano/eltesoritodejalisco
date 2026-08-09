"use client";

import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { useState } from "react";

import { POSCartSidebar } from "@/components/pos/POSCartSidebar";
import { POSMenuGrid } from "@/components/pos/POSMenuGrid";
import { POSAddItemsModal } from "@/components/pos/modals/POSAddItemsModal";
import { POSCheckoutModal } from "@/components/pos/modals/POSCheckoutModal";
import { POSMixedOrderModal } from "@/components/pos/modals/POSMixedOrderModal";
import { POSModifyOrderModal } from "@/components/pos/modals/POSModifyOrderModal";
import { POSTipModal } from "@/components/pos/modals/POSTipModal";

import { PageHeader } from "@/components/PageHeader";
import { FacturacionModal } from "@/components/pos/FacturacionModal";
import { KitchenTicket } from "@/components/pos/KitchenTicket";
import { LowStockBanner } from "@/components/pos/LowStockBanner";
import { OrderTicket } from "@/components/pos/OrderTicket";
import { SplitBillModal } from "@/components/pos/SplitBillModal";
import { getOrderTipAmount } from "@/components/pos/paymentUtils";

import {
  Ban,
  ChefHat,
  ChevronRight,
  DollarSign,
  Download,
  Edit3,
  FileText,
  HandCoins,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  Send,
  ShoppingBag,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { toPng } from "html-to-image";

export default function POSPageClient({ tenantId }: { tenantId: string }) {
  const {
    availableMenuItems,
    customers,
    orders,
    isLoading,
    ordersLoading,
    errorMessage,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    categories,
    filteredMenuItems,
    nextFolioDisplay,
    todayStats,
    refreshOrders,
    lowStockItems,
  } = usePOSData(tenantId);

  const {
    formState,
    formErrors,
    cartError,
    editingOrder,
    setEditingOrder,
    additionalItems,
    modifyingOrder,
    setModifyingOrder,
    modifyItems,
    mixedOrderMenuItem,
    setMixedOrderMenuItem,
    mixedFlavorCounts,
    handleFormChange,
    handleGridItemClick,
    handleMixedFlavorChange,
    handleMixedOrderConfirm,
    handleQuantityChange,
    handleItemNoteChange,
    handleClearCart,
    clearCartArmed,
    openModifyModal,
    handleModifyQuantityChange,
    handleModifyRemoveItem,
    handleSaveModifiedOrder,
    addAdditionalItemRow,
    handleAdditionalItemChange,
    removeAdditionalItemRow,
    handleAddItems,
    handleCheckoutSubmit,
    handleCancelOrder,
    isSubmittingCart,
  } = usePOSCart(availableMenuItems, refreshOrders);

  const {
    isSubmittingCheckout,
    checkoutError,
    checkoutOrder,
    setCheckoutOrder,
    paymentMethod,
    setPaymentMethod,
    receivedAmount,
    setReceivedAmount,
    showTicket,
    setShowTicket,
    showKitchenTicket,
    setShowKitchenTicket,
    tipType,
    setTipType,
    tipInput,
    setTipInput,
    tipAmountCalculated,
    change,
    unusualTipInfo,
    setUnusualTipInfo,
    showWhatsAppModal,
    setShowWhatsAppModal,
    whatsappNumber,
    setWhatsappNumber,
    generateWhatsAppMessage,
    editingTipOrder,
    setEditingTipOrder,
    editTipType,
    setEditTipType,
    editTipInput,
    setEditTipInput,
    editTipAmountCalculated,
    showSplitBill,
    setShowSplitBill,
    billingOrder,
    setBillingOrder,
    handleProcessPayment,
    handleSplitPayment,
    handleUpdateTip,
    handleUndoPayment,
    handleFailedPayment,
  } = usePOSCheckout(refreshOrders);

  // Two-step cancel order: stores the orderId being armed for cancel
  const [cancelArmedId, setCancelArmedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"menu" | "cart">("menu");
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  const handleDownloadImage = async () => {
    if (!checkoutOrder) return;
    setIsDownloadingImage(true);

    const selector = showTicket ? ".ticket-container" : ".kitchen-ticket";
    const element = document.querySelector(selector);

    if (!element) {
      setIsDownloadingImage(false);
      return;
    }

    try {
      const dataUrl = await toPng(element as HTMLElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        style: {
          transform: "scale(1)",
          margin: "0",
          border: "none",
          boxShadow: "none",
        },
      });

      const prefix = showTicket ? "ticket_venta" : "comanda";
      const filename = `${prefix}_#${checkoutOrder.orderNumber}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error al descargar el ticket como imagen:", err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleCancelArm = (orderId: string) => {
    setCancelArmedId(orderId);
    setTimeout(() => setCancelArmedId(null), 3000);
  };

  const handleCancelConfirm = async (orderId: string) => {
    setCancelArmedId(null);
    await handleCancelOrder(orderId);
  };

  const sourceOptions = [
    "TikTok",
    "Instagram",
    "Pasaba por ahí",
    "Recomendación",
    "Google Maps",
    "Otro",
  ];

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm font-bold text-text-light/50 uppercase tracking-widest animate-pulse">
            Iniciando POS...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="rounded-2xl bg-red-500/10 p-8 border border-red-500/20 max-w-md text-center">
          <h2 className="mb-3 text-lg font-black text-red-400 uppercase tracking-wider">
            Error de Conexión
          </h2>
          <p className="text-sm font-medium text-red-400/80 mb-6">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const totalCartItems = formState.items.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );
  const cartTotal = formState.items.reduce((total, item) => {
    const product = availableMenuItems.find((m) => m.id === item.menuItemId);
    return total + (product?.price || 0) * Number(item.quantity);
  }, 0);

  return (
    <div className="space-y-2 lg:space-y-6 pb-20 pos-client-root">
      <PageHeader
        title="Punto de Venta"
        icon={<Receipt className="h-5 w-5 text-primary" />}
        subtitle={`Siguiente Folio: #${nextFolioDisplay}`}
      />

      {/* Selector de pestañas para móvil/tablet */}
      <div className="lg:hidden flex bg-card-light/50 p-1.5 mx-2 rounded-2xl border border-border gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("menu")}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${activeTab === "menu"
              ? "bg-primary text-black border-primary shadow-lg shadow-primary/10"
              : "bg-transparent text-text-light/60 border-transparent hover:text-text-light"
            }`}
        >
          Catálogo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border relative ${activeTab === "cart"
              ? "bg-secondary text-black border-secondary shadow-lg shadow-secondary/10"
              : "bg-transparent text-text-light/60 border-transparent hover:text-text-light"
            }`}
        >
          Pedido
          {totalCartItems > 0 && (
            <span
              className={`rounded-full text-[10px] font-black h-5 min-w-5 px-1.5 flex items-center justify-center transition-colors ${activeTab === "cart"
                  ? "bg-black text-white"
                  : "bg-primary text-black"
                }`}
            >
              {totalCartItems}
            </span>
          )}
        </button>
      </div>

      <main className="grid gap-6 lg:grid-cols-12 items-start mx-2 md:mx-4 lg:mx-6">
        {/* SECCIÓN DEL MENÚ */}
        <div
          className={`lg:col-span-7 xl:col-span-8 w-full min-w-0 space-y-4 ${activeTab === "menu" ? "block" : "hidden lg:block"}`}
        >
          <LowStockBanner items={lowStockItems} />
          <POSMenuGrid
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            categories={categories}
            filteredMenuItems={filteredMenuItems}
            handleGridItemClick={handleGridItemClick}
          />
        </div>

        {/* SECCIÓN DEL CARRITO */}
        <form
          onSubmit={(e) =>
            handleCheckoutSubmit(e, (order) => {
              setCheckoutOrder(order);
              setShowKitchenTicket(true);
              setShowTicket(false);
            })
          }
          className={`lg:col-span-5 xl:col-span-4 h-full w-full min-w-0 ${activeTab === "cart" ? "block" : "hidden lg:block"}`}
        >
          <POSCartSidebar
            formState={formState}
            handleFormChange={handleFormChange}
            customers={customers}
            sourceOptions={sourceOptions}
            formErrors={formErrors}
            cartError={cartError}
            handleClearCart={handleClearCart}
            clearCartArmed={clearCartArmed}
            handleQuantityChange={handleQuantityChange}
            handleItemNoteChange={handleItemNoteChange}
            availableMenuItems={availableMenuItems}
            isSubmitting={isSubmittingCart || isSubmittingCheckout}
          />
        </form>
      </main>

      {/* SECCIÓN: Últimas Órdenes */}
      <section className="rounded-2xl bg-card p-4 sm:p-6 shadow-sm border border-border overflow-hidden mx-2 md:mx-4 lg:mx-6">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            Últimas Órdenes
          </h2>
          <Link
            href="/history"
            className="text-xs font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
          >
            Ver Historial Completo
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {ordersLoading ? (
          /* Skeleton while orders are streaming in */
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-card-light/60 animate-pulse"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
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
                                      cancelArmedId === order.id
                                        ? handleCancelConfirm(order.id)
                                        : handleCancelArm(order.id)
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

            {/* VISTA DE TARJETAS PARA MÓVIL (Últimas Órdenes) */}
            <div className="md:hidden space-y-4 pt-4">
              {orders.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-text-light/30">
                    No hay órdenes todavía
                  </p>
                </div>
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
                          <button
                            type="button"
                            onClick={() => setEditingOrder(order)}
                            className="rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                          </button>
                        )}
                        {order.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => openModifyModal(order)}
                            className="rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
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
                                order.payments?.[0]?.tipAmount?.toString() || "0",
                              );
                            }}
                            className="rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <HandCoins className="h-3.5 w-3.5" />
                            Propina
                          </button>
                        )}
                        {order.status === "PAID" && (
                          <button
                            type="button"
                            onClick={() => setBillingOrder(order)}
                            className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />
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
                          className="rounded-xl bg-card hover:bg-card/80 text-text-light/70 border border-border py-2.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Ticket
                        </button>
                        {order.status !== "PAID" &&
                          order.status !== "UNCOLLECTED" && (
                            <button
                              type="button"
                              onClick={() =>
                                cancelArmedId === order.id
                                  ? handleCancelConfirm(order.id)
                                  : handleCancelArm(order.id)
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
          </>
        )}
      </section>

      {/* ALL MODALS */}
      <POSAddItemsModal
        editingOrder={editingOrder}
        setEditingOrder={setEditingOrder}
        handleAddItems={handleAddItems}
        additionalItems={additionalItems}
        addAdditionalItemRow={addAdditionalItemRow}
        handleAdditionalItemChange={handleAdditionalItemChange}
        removeAdditionalItemRow={removeAdditionalItemRow}
        availableMenuItems={availableMenuItems}
        isSubmitting={isSubmittingCart}
      />

      <POSModifyOrderModal
        modifyingOrder={modifyingOrder}
        setModifyingOrder={setModifyingOrder}
        modifyItems={modifyItems}
        handleModifyQuantityChange={handleModifyQuantityChange}
        handleModifyRemoveItem={handleModifyRemoveItem}
        handleSaveModifiedOrder={handleSaveModifiedOrder}
        isSubmitting={isSubmittingCart}
      />

      <POSMixedOrderModal
        mixedOrderMenuItem={mixedOrderMenuItem}
        setMixedOrderMenuItem={setMixedOrderMenuItem}
        mixedFlavorCounts={mixedFlavorCounts}
        handleMixedFlavorChange={handleMixedFlavorChange}
        handleMixedOrderConfirm={handleMixedOrderConfirm}
      />

      {(showTicket || showKitchenTicket) && checkoutOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-md print-modal-container">
          <div className="max-w-md w-full py-10 space-y-6">
            <div className="flex justify-center gap-3 no-print flex-wrap">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-success text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Imprimir Ticket
              </button>
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloadingImage}
                className="bg-sky-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:bg-sky-500 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                {isDownloadingImage ? "Descargando..." : "Descargar Imagen"}
              </button>
              {showTicket && (
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCheckoutOrder(null);
                  setShowTicket(false);
                  setShowKitchenTicket(false);
                  setWhatsappNumber("");
                  setShowWhatsAppModal(false);
                }}
                className="bg-white/10 text-text-light px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-white/20 active:scale-95 transition-all"
              >
                Cerrar
              </button>
            </div>
            {showTicket ? (
              <OrderTicket order={checkoutOrder} />
            ) : (
              <KitchenTicket order={checkoutOrder} />
            )}
          </div>
        </div>
      )}

      {!showTicket && !showKitchenTicket && (
        <POSCheckoutModal
          checkoutOrder={checkoutOrder}
          setCheckoutOrder={setCheckoutOrder}
          tipAmountCalculated={tipAmountCalculated}
          tipType={tipType}
          setTipType={setTipType}
          tipInput={tipInput}
          setTipInput={setTipInput}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          receivedAmount={receivedAmount}
          setReceivedAmount={setReceivedAmount}
          change={change}
          handleProcessPayment={handleProcessPayment}
          isSubmitting={isSubmittingCheckout}
          setShowSplitBill={setShowSplitBill}
          openModifyModal={openModifyModal}
          handleFailedPayment={handleFailedPayment}
          checkoutError={checkoutError}
          unusualTipInfo={unusualTipInfo}
          setUnusualTipInfo={setUnusualTipInfo}
        />
      )}

      {showWhatsAppModal && checkoutOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border space-y-5">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h2 className="text-base font-black flex items-center gap-2 text-text-light uppercase tracking-tight">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                Ticket por WhatsApp
              </h2>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="text-text-light/40 hover:text-text-light transition-colors p-1 rounded-lg hover:bg-white/10"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Ingresa los 10 dígitos del número celular
            </p>

            <input
              type="tel"
              maxLength={10}
              value={whatsappNumber}
              onChange={(e) =>
                setWhatsappNumber(e.target.value.replace(/\D/g, ""))
              }
              placeholder="3312345678"
              autoFocus
              className="w-full text-2xl font-black p-4 border border-border bg-dark/40 rounded-xl focus:border-emerald-400 outline-none text-center text-text-light tracking-[0.2em] transition-colors placeholder:text-text-light/20"
            />

            <button
              type="button"
              disabled={whatsappNumber.length !== 10}
              onClick={() => {
                const url = `https://wa.me/52${whatsappNumber}?text=${generateWhatsAppMessage()}`;
                window.open(url, "_blank");
                setShowWhatsAppModal(false);
                setCheckoutOrder(null);
                setShowTicket(false);
                setShowKitchenTicket(false);
                setWhatsappNumber("");
              }}
              className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-black text-sm hover:brightness-110 disabled:opacity-30 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" /> Enviar Ticket
            </button>
          </div>
        </div>
      )}

      {billingOrder && (
        <FacturacionModal
          order={billingOrder}
          onClose={() => setBillingOrder(null)}
        />
      )}

      {showSplitBill && checkoutOrder && (
        <SplitBillModal
          order={checkoutOrder}
          onConfirm={handleSplitPayment}
          onClose={() => setShowSplitBill(false)}
          isSubmitting={isSubmittingCheckout}
        />
      )}

      <POSTipModal
        editingTipOrder={editingTipOrder}
        setEditingTipOrder={setEditingTipOrder}
        editTipType={editTipType}
        setEditTipType={setEditTipType}
        editTipInput={editTipInput}
        setEditTipInput={setEditTipInput}
        editTipAmountCalculated={editTipAmountCalculated}
        handleUpdateTip={handleUpdateTip}
        isSubmitting={isSubmittingCheckout}
      />

      {/* Barra flotante para móviles cuando el carrito tiene ítems y estamos en la pestaña del catálogo */}
      {totalCartItems > 0 && activeTab === "menu" && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 animate-[slideUp_0.3s_ease-out]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("cart");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="w-full bg-card/95 backdrop-blur-md hover:bg-[#262626]/95 border border-primary/20 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 border border-primary/30 h-10 w-10 rounded-xl flex items-center justify-center text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest leading-none mb-1">
                  Ver Pedido ({totalCartItems} items)
                </p>
                <p className="text-lg font-black text-text-light">
                  ${cartTotal.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 font-black text-xs text-primary uppercase tracking-wider">
              Continuar <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

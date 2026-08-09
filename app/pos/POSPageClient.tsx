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

import { toPng } from "html-to-image";
import {
  ChevronRight,
  Download,
  MessageCircle,
  Printer,
  Receipt,
  ShoppingBag
} from "lucide-react";
import Link from "next/link";
import ErrorPOS from "./ErrorPOS";
import LoadingOrdersPOS from "./LoadingOrdersPOS";
import LoadingPOS from "./LoadingPOS";
import OrdersMobileFunction from "./OrdersMobilePOS";
import OrdersPOS from "./OrdersPOS";
import WhatsAppTicketPOS from "./WhatsAppTicketPOS";

export default function POSPageClient({ tenantId }: { tenantId: string }) {
  const {
    availableMenuItems,
    isLoading,
    ordersLoading,
    errorMessage,
    nextFolioDisplay,
    refreshOrders,
    lowStockItems,
  } = usePOSData(tenantId);

  const {
    formState,
    editingOrder,
    modifyingOrder,
    mixedOrderMenuItem,
    handleCheckoutSubmit,
    handleCancelOrder,
  } = usePOSCart(availableMenuItems, refreshOrders);

  const {
    isSubmittingCheckout,
    checkoutOrder,
    setCheckoutOrder,
    showTicket,
    setShowTicket,
    showKitchenTicket,
    setShowKitchenTicket,
    showWhatsAppModal,
    setShowWhatsAppModal,
    whatsappNumber,
    setWhatsappNumber,
    generateWhatsAppMessage,
    editingTipOrder,
    showSplitBill,
    setShowSplitBill,
    billingOrder,
    setBillingOrder,
    handleSplitPayment,
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

  const onClickCancel = (orderId: string) => {
    cancelArmedId === orderId
      ? handleCancelConfirm(orderId)
      : handleCancelArm(orderId)
  }

  if (isLoading) {
    return <LoadingPOS />
  }

  if (errorMessage) {
    return (
      <ErrorPOS>{errorMessage}</ErrorPOS>
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
          <POSMenuGrid />
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
          <POSCartSidebar />
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
          <LoadingOrdersPOS />
        ) : (
          <>
            <OrdersPOS onClickCancel={onClickCancel} cancelArmedId={cancelArmedId} />

            {/* VISTA DE TARJETAS PARA MÓVIL (Últimas Órdenes) */}
            <OrdersMobileFunction onClickCancel={onClickCancel} cancelArmedId={cancelArmedId} />
          </>
        )}
      </section>

      {/* ALL MODALS */}
      {editingOrder && <POSAddItemsModal />}

      {modifyingOrder && <POSModifyOrderModal />}

      {mixedOrderMenuItem && <POSMixedOrderModal />}

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

      {!showTicket && !showKitchenTicket && checkoutOrder && (
        <POSCheckoutModal />
      )}

      {showWhatsAppModal && checkoutOrder && (
        <WhatsAppTicketPOS
          onClickClose={() => setShowWhatsAppModal(false)}
          whatsappNumber={whatsappNumber}
          setWhatsappNumber={setWhatsappNumber}
          onClickGenerate={() => {
            const url = `https://wa.me/52${whatsappNumber}?text=${generateWhatsAppMessage()}`;
            window.open(url, "_blank");
            setShowWhatsAppModal(false);
            setCheckoutOrder(null);
            setShowTicket(false);
            setShowKitchenTicket(false);
            setWhatsappNumber("");
          }}
        />
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

      {editingTipOrder && <POSTipModal />}

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

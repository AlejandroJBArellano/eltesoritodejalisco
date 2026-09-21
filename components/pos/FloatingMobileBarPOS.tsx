import { ChevronRight, ShoppingBag } from "lucide-react";

export default function FloatingMobileBarPOS({
  totalCartItems,
  cartTotal,
  setActiveTab,
}: {
  totalCartItems: number;
  cartTotal: number;
  setActiveTab: (tab: "cart" | "menu") => void;
}) {
  return (
    <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 animate-[slideUp_0.3s_ease-out]">
      <button
        type="button"
        onClick={() => {
          setActiveTab("cart");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="w-full bg-card/95 backdrop-blur-md hover:bg-card border border-primary/30 text-white rounded-xl p-3.5 flex items-center justify-between shadow-2xl transition-all active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/15 border border-primary/30 h-9 w-9 rounded-lg flex items-center justify-center text-primary">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider leading-none mb-1">
              Ver Pedido ({totalCartItems} items)
            </p>
            <p className="text-base font-mono font-bold text-text-light tabular-nums">
              ${cartTotal.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 font-bold text-xs text-primary uppercase tracking-wider">
          Continuar <ChevronRight className="h-4 w-4" />
        </div>
      </button>
    </div>
  );
}

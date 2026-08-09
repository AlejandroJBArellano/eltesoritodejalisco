import { ChevronRight, ShoppingBag } from "lucide-react";

export default function FloatingMobileBarPOS({ totalCartItems, cartTotal, setActiveTab }: { totalCartItems: number, cartTotal: number, setActiveTab: (tab: "cart" | "menu") => void }) {

    return <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 animate-[slideUp_0.3s_ease-out]">
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
}
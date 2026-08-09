export default function TabSelectorPOS({
    activeTab, setActiveTab, totalCartItems, cartTotal }: { totalCartItems: number, cartTotal: number, setActiveTab: (tab: "cart" | "menu") => void, activeTab: "cart" | "menu" }) {
    return <div className="lg:hidden flex bg-card-light/50 p-1.5 mx-2 rounded-2xl border border-border gap-1.5 shadow-inner">
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
}
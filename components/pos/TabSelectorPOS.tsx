export default function TabSelectorPOS({
  activeTab,
  setActiveTab,
  totalCartItems,
}: {
  totalCartItems: number;
  cartTotal?: number;
  setActiveTab: (tab: "cart" | "menu") => void;
  activeTab: "cart" | "menu";
}) {
  return (
    <div className="lg:hidden flex bg-card p-1 mx-2 rounded-xl border border-border gap-1 shadow-xs">
      <button
        type="button"
        onClick={() => setActiveTab("menu")}
        className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border cursor-pointer active:scale-95 ${
          activeTab === "menu"
            ? "bg-primary text-dark border-primary shadow-xs"
            : "bg-transparent text-text-light/60 border-transparent hover:text-text-light"
        }`}
      >
        Catálogo
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("cart")}
        className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border relative cursor-pointer active:scale-95 ${
          activeTab === "cart"
            ? "bg-secondary text-dark border-secondary shadow-xs"
            : "bg-transparent text-text-light/60 border-transparent hover:text-text-light"
        }`}
      >
        <span>Pedido</span>
        {totalCartItems > 0 && (
          <span
            className={`rounded-full text-[10px] font-mono font-bold h-4.5 min-w-4.5 px-1 flex items-center justify-center transition-colors ${
              activeTab === "cart"
                ? "bg-dark text-white"
                : "bg-primary text-dark"
            }`}
          >
            {totalCartItems}
          </span>
        )}
      </button>
    </div>
  );
}

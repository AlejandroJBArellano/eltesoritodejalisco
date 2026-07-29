import { Plus, Globe, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { MenuCategory } from "../types";

interface CategoriesPanelProps {
  menuCategories: MenuCategory[];
  isSubmitting: boolean;
  deleteArmedCategoryId: string | null;
  onOpenCreate: () => void;
  onOpenEdit: (cat: MenuCategory) => void;
  onDelete: (id: string) => void;
  onMoveOrder: (index: number, direction: "up" | "down") => void;
}

export function CategoriesPanel({
  menuCategories,
  isSubmitting,
  deleteArmedCategoryId,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onMoveOrder,
}: CategoriesPanelProps) {
  return (
    <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h2 className="text-base font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Categorías ({menuCategories.length})
        </h2>
        <button
          onClick={onOpenCreate}
          className="text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva Categoría
        </button>
      </div>

      <div className="space-y-2">
        {menuCategories
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((cat, index, arr) => (
            <div
              key={cat.id}
              className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-[#E0E0E0]/30 tabular-nums w-5 text-right">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-black text-[#E0E0E0]">{cat.name}</p>
                  {cat.translations?.en?.name && (
                    <p className="text-[10px] text-[#E0E0E0]/40 font-bold flex items-center gap-1">
                      <Globe className="h-2.5 w-2.5" />
                      EN: {cat.translations.en.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Order buttons */}
                <button
                  onClick={() => onMoveOrder(index, "up")}
                  disabled={index === 0 || isSubmitting}
                  className="rounded-lg p-1.5 text-[#E0E0E0]/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="Mover arriba"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onMoveOrder(index, "down")}
                  disabled={index === arr.length - 1 || isSubmitting}
                  className="rounded-lg p-1.5 text-[#E0E0E0]/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  title="Mover abajo"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                {/* Edit */}
                <button
                  onClick={() => onOpenEdit(cat)}
                  className="rounded-lg p-1.5 text-[#E0E0E0]/60 hover:text-white hover:bg-white/10 transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {/* Delete */}
                <button
                  onClick={() => onDelete(cat.id)}
                  className={`rounded-lg border px-2 py-1 text-xs font-black transition-all ${
                    deleteArmedCategoryId === cat.id
                      ? "bg-red-500/30 border-red-500/50 text-red-300"
                      : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  }`}
                  title={deleteArmedCategoryId === cat.id ? "Confirmar eliminación" : "Eliminar"}
                >
                  {deleteArmedCategoryId === cat.id ? "¿Seguro?" : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        {menuCategories.length === 0 && (
          <p className="text-xs text-[#E0E0E0]/30 italic text-center py-4">
            No hay categorías registradas. Crea una para empezar.
          </p>
        )}
      </div>
    </section>
  );
}

import { useMemo } from "react";
import { CheckCircle2, Filter, Utensils } from "lucide-react";
import { useMenuItems } from "../hooks/useMenuItems";
import { useMenuCategories } from "../hooks/useMenuCategories";

export function MenuStatsCards() {
  const { items } = useMenuItems();
  const { menuCategories } = useMenuCategories();

  const totalItems = items.length;
  const activeCount = useMemo(
    () => items.filter((i) => i.isAvailable).length,
    [items],
  );

  const categoriesCount = useMemo(() => {
    const set = new Set<string>();
    menuCategories.forEach((c) => set.add(c.name));
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return set.size;
  }, [menuCategories, items]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Total Platillos
          </p>
          <p className="mt-1 text-2xl font-black text-text-light">
            {totalItems}
          </p>
        </div>
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Utensils className="h-5 w-5" />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Platillos Activos
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-400">
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Categorías Registradas
          </p>
          <p className="mt-1 text-2xl font-black text-purple-400">
            {categoriesCount}
          </p>
        </div>
        <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
          <Filter className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

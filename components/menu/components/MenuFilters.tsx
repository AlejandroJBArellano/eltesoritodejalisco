import { TableSearchInput } from "@/components/ui/DataTableControls";

interface MenuFiltersProps {
  searchQuery: string;
  categoryFilter: string;
  availabilityFilter: "all" | "available" | "unavailable";
  categories: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAvailabilityChange: (value: "all" | "available" | "unavailable") => void;
}

export function MenuFilters({
  searchQuery,
  categoryFilter,
  availabilityFilter,
  categories,
  onSearchChange,
  onCategoryChange,
  onAvailabilityChange,
}: MenuFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
      <div>
        <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
          Buscar Producto
        </label>
        <TableSearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o descripción..."
        />
      </div>

      <div>
        <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
          Categoría
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-primary"
        >
          <option value="all">Todas las Categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
          Estado
        </label>
        <select
          value={availabilityFilter}
          onChange={(e) =>
            onAvailabilityChange(
              e.target.value as "all" | "available" | "unavailable",
            )
          }
          className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-primary"
        >
          <option value="all">Todos los Estados</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">No Disponibles</option>
        </select>
      </div>
    </div>
  );
}

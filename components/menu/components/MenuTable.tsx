import Image from "next/image";
import {
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";
import {
  BookOpen,
  CheckCircle2,
  Image as ImageIcon,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { MenuItem, SortField } from "../types";

interface MenuTableProps {
  paginatedItems: MenuItem[];
  sortField: SortField;
  sortDirection: "asc" | "desc";
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  deleteArmedItemId: string | null;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpenRecipe: (itemId: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
}

export function MenuTable({
  paginatedItems,
  sortField,
  sortDirection,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  deleteArmedItemId,
  onSort,
  onPageChange,
  onPageSizeChange,
  onOpenRecipe,
  onEdit,
  onDelete,
}: MenuTableProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-dark/40 text-xs uppercase tracking-wider text-text-light/60 border-b border-border">
            <tr>
              <th className="py-3 px-4 font-bold">Imagen</th>
              <TableHeaderSortCell
                field="name"
                label="Nombre"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={(f) => onSort(f as SortField)}
              />
              <TableHeaderSortCell
                field="category"
                label="Categoría"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={(f) => onSort(f as SortField)}
              />
              <TableHeaderSortCell
                field="price"
                label="Precio"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={(f) => onSort(f as SortField)}
              />
              <TableHeaderSortCell
                field="isAvailable"
                label="Estado"
                currentSortField={sortField}
                sortDirection={sortDirection}
                onSort={(f) => onSort(f as SortField)}
              />
              <th className="py-3 px-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-white/2 transition-colors"
              >
                <td className="py-3 px-4">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-dark/40 border border-border flex items-center justify-center text-text-light/30">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <p className="font-bold text-text-light">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-text-light/50 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="rounded-lg bg-white/5 border border-border px-2.5 py-1 text-xs font-bold text-text-light/80">
                    {item.category || "Sin categoría"}
                  </span>
                </td>
                <td className="py-3 px-4 font-black text-primary">
                  ${Number(item.price).toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${item.isAvailable
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                  >
                    {item.isAvailable ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Disponible
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        Agotado
                      </>
                    )}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onOpenRecipe(item.id)}
                      className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2 text-purple-400 hover:bg-purple-500/20 transition-colors"
                      title="Gestionar Receta"
                    >
                      <BookOpen className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(item)}
                      className="rounded-lg bg-white/5 border border-border p-2 text-text-light/80 hover:text-white hover:bg-white/10 transition-colors"
                      title="Editar Producto"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className={`rounded-lg border p-2 transition-all text-xs font-black ${deleteArmedItemId === item.id
                          ? "bg-red-500/30 border-red-500/50 text-red-300 px-2"
                          : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                        }`}
                      title={
                        deleteArmedItemId === item.id
                          ? "Confirmar eliminación"
                          : "Eliminar Producto"
                      }
                    >
                      {deleteArmedItemId === item.id ? (
                        "¿Seguro?"
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedItems.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-text-light/40 italic"
                >
                  No se encontraron productos en el menú.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={(size) => {
          onPageSizeChange(size);
          onPageChange(1);
        }}
      />
    </div>
  );
}

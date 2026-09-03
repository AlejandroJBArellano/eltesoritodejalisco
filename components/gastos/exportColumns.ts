import type { ExportColumn } from "@/components/ui/DataTableControls";
import type { Expense } from "./types";

export const EXPENSES_EXPORT_COLUMNS: ExportColumn<Expense>[] = [
  { header: "Fecha", key: "date" },
  {
    header: "Categoría",
    accessor: (e) => e.expense_categories?.name || "Sin Categoría",
  },
  {
    header: "Tipo de Gasto",
    accessor: (e) =>
      e.expense_categories?.tipo_gasto === "fijo" ? "Fijo" : "Variable",
  },
  { header: "Descripción", key: "description" },
  {
    header: "Monto",
    accessor: (e) => `$${Number(e.amount || 0).toFixed(2)}`,
  },
  {
    header: "Factura",
    accessor: (e) => (e.has_invoice ? "Sí (FAC)" : "No"),
  },
];

import type { ExportColumn } from "@/components/ui/DataTableControls";
import type {
  DailySaleExportItem,
  EnrichedProductSaleItem,
  TopCustomerExport,
} from "./types";

export const DAILY_SALES_EXPORT_COLUMNS: ExportColumn<DailySaleExportItem>[] = [
  { header: "Fecha", key: "date" },
  { header: "Día de la Semana", key: "dayOfWeek" },
  {
    header: "Ventas Totales",
    accessor: (d) => `$${d.totalSales.toFixed(2)}`,
  },
  { header: "Órdenes", key: "totalOrders" },
  {
    header: "Ticket Promedio",
    accessor: (d) => `$${d.averageTicket.toFixed(2)}`,
  },
  { header: "Producto Estrella", key: "topProduct" },
  {
    header: "% del Total",
    accessor: (d) => `${d.percentageOfPeriod.toFixed(1)}%`,
  },
];

export const PRODUCT_SALES_EXPORT_COLUMNS: ExportColumn<EnrichedProductSaleItem>[] = [
  {
    header: "Ranking",
    accessor: (p) => (p.rank ? `#${p.rank}` : "-"),
  },
  { header: "Producto", key: "name" },
  { header: "Categoría", accessor: (p) => p.category || "General" },
  { header: "Unidades Vendidas", key: "quantity" },
  {
    header: "Precio Promedio",
    accessor: (p) => {
      const avg =
        p.averageUnitPrice ?? (p.quantity > 0 ? p.revenue / p.quantity : 0);
      return `$${avg.toFixed(2)}`;
    },
  },
  {
    header: "Ingresos Totales",
    accessor: (p) => `$${p.revenue.toFixed(2)}`,
  },
  {
    header: "% Participación",
    accessor: (p) =>
      typeof p.percentageOfTotal === "number"
        ? `${p.percentageOfTotal.toFixed(1)}%`
        : "-",
  },
];

export const TOP_CUSTOMERS_EXPORT_COLUMNS: ExportColumn<TopCustomerExport>[] = [
  { header: "Cliente", accessor: (c) => c.name || "Cliente" },
  {
    header: "Gasto Total",
    accessor: (c) => `$${Number(c.totalSpend ?? c.total_spend ?? 0).toFixed(2)}`,
  },
  {
    header: "Puntos Lealtad",
    accessor: (c) => c.loyaltyPoints ?? c.loyalty_points ?? 0,
  },
];

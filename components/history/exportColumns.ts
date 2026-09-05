import type { ExportColumn } from "@/components/ui/DataTableControls";
import {
  getOrderPaymentLabel,
  getOrderTipAmount,
} from "@/components/pos/paymentUtils";
import type { DailyCut, Order } from "./types";

export const ORDERS_EXPORT_COLUMNS: ExportColumn<Order>[] = [
  { header: "Folio", key: "orderNumber" },
  {
    header: "Fecha",
    accessor: (o) =>
      o.createdAt
        ? new Date(o.createdAt).toLocaleString("es-MX", {
            timeZone: "America/Mexico_City",
          })
        : "N/A",
  },
  {
    header: "Canal de Venta",
    accessor: (o) =>
      o.source === "PICKUP_APP" ? "App Móvil / Pickup" : "Punto de Venta (POS)",
  },
  {
    header: "Mesa/Tipo",
    accessor: (o) => o.table || (o.source === "PICKUP_APP" ? "Pickup" : "Para Llevar"),
  },
  {
    header: "Fecha/Hora de Completado",
    accessor: (o) => {
      const raw =
        o.completedAt ||
        (o as unknown as { completed_at?: string | null }).completed_at;
      if (!raw) return "N/A";
      try {
        const d = new Date(raw);
        return isNaN(d.getTime())
          ? "N/A"
          : d.toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
      } catch {
        return "N/A";
      }
    },
  },
  {
    header: "Hora de Pickup / Programada",
    accessor: (o) => {
      const raw =
        o.pickupTime ||
        (o as unknown as { pickup_time?: string | null }).pickup_time;
      if (!raw) return "Inmediato / N/A";
      try {
        const d = new Date(raw);
        return isNaN(d.getTime())
          ? "Inmediato / N/A"
          : d.toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
      } catch {
        return "Inmediato / N/A";
      }
    },
  },
  {
    header: "Método de Pago",
    accessor: (o) => getOrderPaymentLabel(o),
  },
  {
    header: "Subtotal",
    accessor: (o) => `$${((o.total || 0) - (o.tax || 0)).toFixed(2)}`,
  },
  {
    header: "IVA",
    accessor: (o) => `$${(o.tax || 0).toFixed(2)}`,
  },
  {
    header: "Propina",
    accessor: (o) => `$${getOrderTipAmount(o).toFixed(2)}`,
  },
  {
    header: "Total",
    accessor: (o) => `$${(Number(o.total || 0) + getOrderTipAmount(o)).toFixed(2)}`,
  },
  { header: "Estado", key: "status" },
  {
    header: "Productos",
    accessor: (o) =>
      o.orderItems
        ?.map((i) => `${i.quantity}x ${i.menuItem?.name || "Producto"}`)
        .join("; ") || "",
  },
  {
    header: "Notas del Pedido",
    accessor: (o) => o.notes?.trim() || "N/A",
  },
];

export const DAILY_CUTS_EXPORT_COLUMNS: ExportColumn<DailyCut>[] = [
  { header: "Fecha", key: "cut_date" },
  { header: "Órdenes", key: "total_orders" },
  {
    header: "Venta Bruta",
    accessor: (c) =>
      `$${(Number(c.venta_neta || 0) + Number(c.iva_acumulado || 0)).toFixed(2)}`,
  },
  {
    header: "Venta Neta",
    accessor: (c) => `$${Number(c.venta_neta || 0).toFixed(2)}`,
  },
  {
    header: "IVA",
    accessor: (c) => `$${Number(c.iva_acumulado || 0).toFixed(2)}`,
  },
  {
    header: "Gastos",
    accessor: (c) => `-$${Number(c.total_gastos || 0).toFixed(2)}`,
  },
  {
    header: "Comisión",
    accessor: (c) => `-$${Number(c.comision_tarjeta || 0).toFixed(2)}`,
  },
  {
    header: "Utilidad Final",
    accessor: (c) => `$${Number(c.utilidad_final || 0).toFixed(2)}`,
  },
];

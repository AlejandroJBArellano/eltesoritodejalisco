// Reportes de personalización: unidades e ingresos por opción, por canal.
// Fuente: order_item_options (snapshot congelado), así sobrevive a cambios
// o borrados de la configuración.

export type SalesChannel = "POS" | "PICKUP";

export interface RawOptionReportOrder {
  id: string;
  source: string | null;
  order_items?: Array<{
    menu_item_id: string;
    quantity: number;
    menu_items?: { name?: string | null } | { name?: string | null }[] | null;
    order_item_options?: Array<{
      option_id: string | null;
      group_name: string;
      option_name: string;
      quantity: number;
      unit_price: number | null;
    }> | null;
  }> | null;
}

export interface OptionSalesRow {
  key: string;
  menuItemId: string;
  productName: string;
  groupName: string;
  optionName: string;
  /** Unidades de la opción (cantidad × unidades del renglón). */
  units: number;
  /** Ingreso por la opción (precio de la opción × unidades). */
  revenue: number;
  /** Órdenes distintas que la incluyeron. */
  orders: number;
  byChannel: Record<SalesChannel, { units: number; revenue: number }>;
}

export function channelOf(source: string | null | undefined): SalesChannel {
  return source === "PICKUP_APP" ? "PICKUP" : "POS";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function productNameOf(item: NonNullable<RawOptionReportOrder["order_items"]>[number]) {
  const rel = item.menu_items;
  if (!rel) return "Producto";
  if (Array.isArray(rel)) return rel[0]?.name || "Producto";
  return rel.name || "Producto";
}

/** Agrega las opciones vendidas, ordenadas por unidades (desc). */
export function aggregateOptionSales(
  orders: RawOptionReportOrder[],
): OptionSalesRow[] {
  const rows = new Map<string, OptionSalesRow & { orderIds: Set<string> }>();

  for (const order of orders) {
    const channel = channelOf(order.source);
    for (const item of order.order_items || []) {
      const itemQty = Number(item.quantity) || 0;
      for (const opt of item.order_item_options || []) {
        const units = (Number(opt.quantity) || 0) * itemQty;
        if (units <= 0) continue;
        const revenue = (Number(opt.unit_price) || 0) * units;
        const key = `${item.menu_item_id}|${opt.option_id ?? `${opt.group_name}|${opt.option_name}`}`;
        let row = rows.get(key);
        if (!row) {
          row = {
            key,
            menuItemId: item.menu_item_id,
            productName: productNameOf(item),
            groupName: opt.group_name,
            optionName: opt.option_name,
            units: 0,
            revenue: 0,
            orders: 0,
            byChannel: {
              POS: { units: 0, revenue: 0 },
              PICKUP: { units: 0, revenue: 0 },
            },
            orderIds: new Set(),
          };
          rows.set(key, row);
        }
        row.units += units;
        row.revenue += revenue;
        row.byChannel[channel].units += units;
        row.byChannel[channel].revenue += revenue;
        row.orderIds.add(order.id);
      }
    }
  }

  return Array.from(rows.values())
    .map(({ orderIds, ...row }) => ({
      ...row,
      revenue: round2(row.revenue),
      orders: orderIds.size,
      byChannel: {
        POS: { units: row.byChannel.POS.units, revenue: round2(row.byChannel.POS.revenue) },
        PICKUP: {
          units: row.byChannel.PICKUP.units,
          revenue: round2(row.byChannel.PICKUP.revenue),
        },
      },
    }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue);
}

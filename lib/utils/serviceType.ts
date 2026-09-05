export type OrderServiceType = "COMEDOR" | "PARA_LLEVAR" | "DOMICILIO";

export type NormalizedServiceType = "comedor" | "para_llevar" | "domicilio";

/**
 * Normaliza cualquier valor almacenado en `table` al tipo de servicio base.
 */
export function getServiceType(table?: string | null): NormalizedServiceType {
  if (!table || !table.trim()) return "para_llevar";
  const t = table.trim().toLowerCase();
  if (t === "domicilio" || t === "a domicilio") return "domicilio";
  if (t === "para llevar" || t === "takeout" || t === "pickup") return "para_llevar";
  return "comedor";
}

/**
 * Formato de etiqueta amigable para mostrar en interfaces de usuario (POS, KDS, tablas).
 */
export function formatServiceLabel(table?: string | null): string {
  if (!table || !table.trim()) return "Para Llevar";
  const t = table.trim();
  const lower = t.toLowerCase();
  if (lower === "domicilio" || lower === "a domicilio") return "A Domicilio";
  if (lower === "para llevar" || lower === "takeout" || lower === "pickup") return "Para Llevar";
  if (lower === "comer aquí" || lower === "comedor") return "Comedor";
  if (lower.startsWith("mesa")) return t;
  return `Mesa ${t}`;
}

/**
 * Formato para imprimir en comandas de cocina y tickets de pago.
 */
export function formatServiceTicket(table?: string | null): string {
  if (!table || !table.trim()) return "PARA LLEVAR";
  const t = table.trim();
  const lower = t.toLowerCase();
  if (lower === "domicilio" || lower === "a domicilio") return "A DOMICILIO";
  if (lower === "para llevar" || lower === "takeout" || lower === "pickup") return "PARA LLEVAR";
  if (lower === "comer aquí" || lower === "comedor") return "COMEDOR";
  if (lower.startsWith("mesa")) return t.toUpperCase();
  return `MESA ${t.toUpperCase()}`;
}

/**
 * Resuelve el valor final de `table` que se guardará en la base de datos según el tipo de servicio seleccionado
 * y el texto opcional de mesa ingresado.
 */
export function resolveTableValue(
  serviceType: OrderServiceType,
  tableInput?: string | null,
): string {
  switch (serviceType) {
    case "PARA_LLEVAR":
      return "Para Llevar";
    case "DOMICILIO":
      return "Domicilio";
    case "COMEDOR": {
      const trimmed = (tableInput || "").trim();
      if (!trimmed) return "Comedor";
      if (trimmed.toLowerCase().startsWith("mesa")) return trimmed;
      return `Mesa ${trimmed}`;
    }
  }
}

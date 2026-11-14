import type { Selection, SelectionSnapshotLine } from "./types";
import { normalizeSelections } from "./selection";

/**
 * Línea única para ticket de cocina / KDS / carrito:
 *   "2x Pastor, 1x Birria · Queso extra"
 *
 * Opciones del mismo grupo separadas por ", "; grupos por " · ".
 * Dentro de un grupo se antepone "Nx" a todas las opciones si alguna lleva más de 1.
 */
export function formatSelectionLine(
  lines: SelectionSnapshotLine[] | null | undefined,
): string {
  if (!lines || lines.length === 0) return "";
  const sorted = lines
    .filter((l) => l.quantity > 0)
    .slice()
    .sort(
      (a, b) =>
        a.groupSort - b.groupSort ||
        (a.groupName < b.groupName ? -1 : a.groupName > b.groupName ? 1 : 0) ||
        a.optionSort - b.optionSort,
    );

  const groups: SelectionSnapshotLine[][] = [];
  const keyOf = (l: SelectionSnapshotLine) => `${l.groupId ?? ""}|${l.groupName}`;
  for (const line of sorted) {
    const last = groups[groups.length - 1];
    if (last && keyOf(last[0]) === keyOf(line)) last.push(line);
    else groups.push([line]);
  }

  return groups
    .map((group) => {
      const showQty = group.some((l) => l.quantity > 1);
      return group
        .map((l) => (showQty ? `${l.quantity}x ${l.optionName}` : l.optionName))
        .join(", ");
    })
    .join(" · ");
}

/**
 * Clave para fusionar renglones del carrito: mismo producto, misma selección
 * y misma nota libre ⇒ mismo renglón.
 */
export function selectionKey(
  menuItemId: string,
  selections: Selection[] | null | undefined,
  notes?: string | null,
): string {
  const sel = normalizeSelections(selections)
    .map((s) => `${s.optionId}:${s.quantity}`)
    .join(",");
  return `${menuItemId}|${sel}|${(notes || "").trim()}`;
}

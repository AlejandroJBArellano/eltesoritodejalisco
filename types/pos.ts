import { OrderWithDetails, PaymentTerminal } from "./index";
import type {
  MenuItemCustomization,
  Selection,
  SelectionSnapshotLine,
} from "@/lib/customization/types";
export type { PaymentTerminal };

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  category?: string;
  imageUrl?: string;
  /** Stock del ingrediente vinculado directamente (tracking PIECE). null = sin tracking directo. */
  currentStock?: number | null;
  minimumStock?: number | null;
  ingredientId?: string | null;
  /** Grupos de opciones; si tiene alguno activo, abre el modal al tocarlo. */
  customization?: MenuItemCustomization | null;
  /** "Desde $X" cuando la personalización cambia el precio mínimo. */
  priceFrom?: number | null;
};

export type Customer = {
  id: string;
  name: string;
};

export type OrderItemDraft = {
  menuItemId: string;
  quantity: string;
  notes: string;
  /** Personalización elegida (por unidad del renglón). */
  selections?: Selection[];
  discountType?: "PERCENT" | "FIXED" | null;
  discountValue?: number | null;
  discountAmount?: number | null;
  discountScope?: "ROW" | "UNIT" | null;
  discountReason?: string | null;
};

import type { OrderServiceType } from "@/lib/utils/serviceType";
export type { OrderServiceType };

export type Order = OrderWithDetails;

export type OrderFormState = {
  customerId: string;
  source: string;
  serviceType: OrderServiceType;
  table: string;
  notes: string;
  items: OrderItemDraft[];
  discountType?: "PERCENT" | "FIXED" | null;
  discountValue?: number | null;
  discountReason?: string | null;
};

export type ModifyItem = {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  menuItemName: string;
  notes?: string;
  /** Selección actual (editable si el producto es personalizable). */
  selections?: Selection[];
  /** Líneas para mostrar (snapshot o recalculadas tras editar). */
  selectionLines?: SelectionSnapshotLine[];
  /** Precio sobre el que aplica el descuento por artículo. */
  discountBasePrice?: number | null;
  /** La selección cambió respecto a la orden guardada. */
  selectionChanged?: boolean;
  discountType?: "PERCENT" | "FIXED" | null;
  discountValue?: number | null;
  discountAmount?: number;
  discountScope?: "ROW" | "UNIT" | null;
  discountReason?: string | null;
};

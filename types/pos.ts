import { OrderWithDetails } from "./index";

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
};

export type Customer = {
  id: string;
  name: string;
};

export type OrderItemDraft = {
  menuItemId: string;
  quantity: string;
  notes: string;
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
  discountType?: "PERCENT" | "FIXED" | null;
  discountValue?: number | null;
  discountAmount?: number;
  discountScope?: "ROW" | "UNIT" | null;
  discountReason?: string | null;
};

export const MIXED_ORDER_TOTAL = 3;
export const MIXED_ORDER_FLAVORS = [
  "Carnitas",
  "Birria",
  "Pastor",
  "Jamaica",
] as const;
export type MixedFlavor = (typeof MIXED_ORDER_FLAVORS)[number];

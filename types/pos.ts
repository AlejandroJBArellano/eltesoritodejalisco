import { OrderWithDetails } from "./index";

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  category?: string;
  imageUrl?: string;
};

export type Customer = {
  id: string;
  name: string;
};

export type OrderItemDraft = {
  menuItemId: string;
  quantity: string;
  notes: string;
};

export type Order = OrderWithDetails;

export type OrderFormState = {
  customerId: string;
  source: string;
  table: string;
  notes: string;
  items: OrderItemDraft[];
};

export type ModifyItem = {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  menuItemName: string;
};

export const MIXED_ORDER_TOTAL = 3;
export const MIXED_ORDER_FLAVORS = ["Carnitas", "Birria", "Pastor", "Jamaica"] as const;
export type MixedFlavor = (typeof MIXED_ORDER_FLAVORS)[number];

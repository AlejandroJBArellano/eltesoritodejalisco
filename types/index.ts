// TesoritoOS - TypeScript Type Definitions
// Generated types for the Restaurant Management System

// ============================================
// INVENTORY & RECIPES TYPES
// ============================================

export interface Ingredient {
  id: string;
  name: string;
  unit: "kg" | "lt" | "unit" | "gr" | "ml" | string;
  currentStock: number;
  minimumStock: number;
  costPerUnit?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeItem {
  id: string;
  menuItemId: string;
  ingredientId: string;
  quantityRequired: number;
  menuItem?: MenuItem;
  ingredient?: Ingredient;
}

export interface StockAdjustment {
  id: string;
  ingredientId: string;
  adjustment: number;
  reason?: string;
  userId?: string;
  createdAt: Date;
}

// ============================================
// ORDERS & POS TYPES
// ============================================

export enum OrderStatus {
  PENDING = "PENDING",
  PREPARING = "PREPARING",
  READY = "READY",
  DELIVERED = "DELIVERED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  source: string;
  status: OrderStatus;
  table?: string;
  notes?: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  customer?: Customer;
  orderItems?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  createdAt: Date;
  menuItem?: MenuItem;
}

// ============================================
// CRM & CUSTOMERS TYPES
// ============================================

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: Date;
  loyaltyPoints: number;
  totalSpend: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PAYMENTS TYPES
// ============================================

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  TRANSFER = "TRANSFER",
  OTHER = "OTHER",
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  receivedAmount?: number;
  change?: number;
  createdAt: Date;
}

// ============================================
// USERS & AUTH TYPES
// ============================================

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  WAITER = "WAITER",
  CHEF = "CHEF",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// EXTENDED TYPES FOR KDS & SMART BATCHING
// ============================================

export interface OrderWithDetails extends Order {
  orderItems: (OrderItem & { menuItem: MenuItem })[];
  elapsedMinutes?: number;
}

export interface BatchedMenuItem {
  menuItemId: string;
  menuItemName: string;
  totalQuantity: number;
  orders: {
    orderId: string;
    orderNumber: string;
    quantity: number;
  }[];
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateOrderRequest {
  customerId?: string;
  source: string;
  table?: string;
  notes?: string;
  orderItems: {
    menuItemId: string;
    quantity: number;
    notes?: string;
  }[];
}

export interface UpdateInventoryRequest {
  ingredientId: string;
  adjustment: number;
  reason?: string;
  userId?: string;
}

export interface CreateRecipeRequest {
  menuItemId: string;
  ingredients: {
    ingredientId: string;
    quantityRequired: number;
  }[];
}

// ============================================
// UTILITY TYPES
// ============================================

export type LeadSource =
  | "TikTok"
  | "Instagram"
  | "Pasaba por ahí"
  | "Recomendación"
  | string;

export interface InventoryDeductionResult {
  success: boolean;
  deductions: {
    ingredientId: string;
    ingredientName: string;
    quantityDeducted: number;
    previousStock: number;
    newStock: number;
  }[];
  errors?: string[];
}

// ============================================
// SMART BATCH TYPES
// ============================================

export interface SmartBatch {
  id: string;
  ingredientId: string;
  name: string;
  startedAt: Date;
  endedAt?: Date;
  finalYield?: any; // Json
  isActive: boolean;
  ingredient?: Ingredient;
}

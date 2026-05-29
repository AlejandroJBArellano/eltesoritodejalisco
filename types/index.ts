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
  UNCOLLECTED = "UNCOLLECTED",
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
  status?: OrderStatus;
  preparationTimeSeconds?: number | null;
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
  tipAmount?: number;
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
// ATTENDANCE & TIPS TYPES
// ============================================

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in: string;
  check_out?: string;
  status: "ACTIVE" | "FINISHED";
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface TipBreakdownItem {
  userId: string;
  name: string;
  hours: number;
  tipAmount: number;
}

export interface DailyTip {
  id: string;
  cut_date: string;
  total_card_tips: number;
  total_cash_tips: number;
  total_tips: number;
  total_hours: number;
  breakdown: TipBreakdownItem[];
  created_at: string;
}

// ============================================
// EXTENDED TYPES FOR KDS & SMART BATCHING
// ============================================

export interface OrderWithDetails extends Order {
  orderItems: (OrderItem & { menuItem: MenuItem })[];
  elapsedMinutes?: number;
  payments?: Payment[];
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

// ============================================
// TASKS & CHECKLIST TYPES
// ============================================

export type TaskFrequency =
  | "CONTINUOUS"
  | "VARIABLE"
  | "ROUTINE"
  | "DAILY"
  | "WEEKLY"
  | "CLOSING";

export type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "PAUSED"
  | "COMPLETED"
  | "APPROVED";

export interface PrimordialTask {
  id: string;
  name: string;
  frequency_type: TaskFrequency;
  requires_photo: boolean;
  timeout_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskExecution {
  id: string;
  task_id: string;
  user_id?: string;
  status: TaskStatus;
  start_time?: string;
  end_time?: string;
  last_resumed_at?: string;
  paused_seconds: number;
  net_duration_minutes?: number;
  photo_url?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  task?: PrimordialTask;
  user?: User;
}

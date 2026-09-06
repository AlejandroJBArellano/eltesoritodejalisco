import type { OrderWithDetails } from "@/types";
import type { Database } from "@/types/supabase";

export type Order = OrderWithDetails;

export type DbDailyCut = Database["public"]["Tables"]["daily_cuts"]["Row"];
export type DbDailyCutInsert = Database["public"]["Tables"]["daily_cuts"]["Insert"];
export type DbDailyTip = Database["public"]["Tables"]["daily_tips"]["Row"];
export type DbDailyTipInsert = Database["public"]["Tables"]["daily_tips"]["Insert"];
export type DbExpense = Database["public"]["Tables"]["expenses"]["Row"];

export interface TipBreakdownItem {
  employee_name: string;
  hours_worked: number;
  tip_amount: number;
}

export interface ExpenseDetailItem {
  description: string;
  amount: number;
  category?: string;
  has_invoice?: boolean;
}

export interface DailyCut {
  id: string;
  cut_date: string;
  venta_neta: number;
  iva_acumulado: number;
  propinas_efectivo: number;
  propinas_tarjeta: number;
  caja_efectivo: number;
  caja_tarjeta: number;
  comision_tarjeta?: number | null;
  utilidad_real: number;
  total_gastos: number;
  utilidad_final: number;
  total_orders: number;
  notes: string | null;
  expenses_detail: ExpenseDetailItem[] | null;
  created_at: string;
}

export type OrderSortField = "orderNumber" | "createdAt" | "table" | "total";
export type CutSortField = "cut_date" | "total_orders" | "venta_neta" | "utilidad_final";

export interface OrderFilters {
  searchQuery: string;
  dateFilter: string;
  tableFilter: string;
  paymentMethodFilter: string;
  sourceFilter: string;
}

export interface DailyCutSummaryTotals {
  ventaNeta: number;
  ivaAcumulado: number;
  propinasEfectivo: number;
  propinasTarjeta: number;
  cajaEfectivo: number;
  cajaTarjeta: number;
  comisionTarjeta: number;
  cajaTarjetaNeta: number;
  utilidadReal: number;
  utilidadFinal: number;
  ordersAtTable: number;
  ordersDelivery: number;
  averageTicket: number;
  creditoOtorgadoHoy: number;
}

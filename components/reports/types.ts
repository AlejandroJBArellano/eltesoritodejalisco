export type ProductSaleItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
};

export type ReportData = {
  period: string;
  summary: {
    totalSales: number;
    totalOrders: number;
    averageTicket: number;
    totalTips: number;
    averageCompletionTimeMinutes: number;
    totalExpenses: number;
    totalUncollected: number;
    totalCardCommissions?: number;
    terminalCommissionRate?: number;
  };
  salesByDay: Record<string, number>;
  ordersByDay?: Record<string, number>;
  itemsByDay: Record<
    string,
    { name: string; quantity: number; revenue: number }[]
  >;
  salesBySource: Record<string, { count: number; total: number }>;
  topSellingItems: { name: string; quantity: number; revenue: number }[];
  productSales?: ProductSaleItem[];
  categories?: string[];
  customers: {
    topCustomers: { name: string; totalSpend: number; loyaltyPoints: number }[];
    newCustomersCount: number;
  };
};

export type Period =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "month"
  | "last_month"
  | "custom";

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  "7days": "Últimos 7 días",
  "30days": "Últimos 30 días",
  month: "Mes Actual",
  last_month: "Mes Anterior",
  custom: "Personalizado",
};

export interface DailySaleExportItem {
  date: string;
  dayOfWeek: string;
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  topProduct: string;
  percentageOfPeriod: number;
}

export interface EnrichedProductSaleItem extends ProductSaleItem {
  rank?: number;
  averageUnitPrice?: number;
  percentageOfTotal?: number;
}

export type TopCustomerExport = {
  name?: string;
  totalSpend?: number;
  total_spend?: number;
  loyaltyPoints?: number;
  loyalty_points?: number;
};

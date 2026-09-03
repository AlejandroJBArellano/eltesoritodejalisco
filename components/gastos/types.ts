import type { Database } from "@/types/supabase";

export type DbExpense = Database["public"]["Tables"]["expenses"]["Row"];
export type DbExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];

export type ExpenseCategoryType = "fijo" | "variable";

export type Category = {
  id: string;
  name: string;
  color: string;
  tipo_gasto: ExpenseCategoryType;
  created_at?: string | null;
};

export type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string;
  has_invoice: boolean;
  category_id: string;
  created_at?: string | null;
  expense_categories?: {
    name: string;
    color: string;
    tipo_gasto: ExpenseCategoryType;
  };
};

export type ExpenseSortField = "date" | "amount" | "description" | "category";

export type InvoiceFilter = "all" | "invoiced" | "no_invoice";
export type ExpenseTypeFilter = "all" | "fijo" | "variable";

export interface DailyExpenseTrendItem {
  date: string;
  rawDate: string;
  fijos: number;
  variables: number;
  total: number;
}

export interface CategoryExpenseItem {
  name: string;
  value: number;
  color: string;
  tipo: string;
}

export interface GastosSummary {
  totalExpenses: number;
  fixedExpensesTotal: number;
  variableExpensesTotal: number;
  invoicedExpensesTotal: number;
  totalSales: number;
  netUtility: number;
  profitMargin: number;
}

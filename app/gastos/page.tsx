"use client";

import { GastosContent } from "@/components/gastos/GastosContent";

export { EXPENSES_EXPORT_COLUMNS } from "@/components/gastos/exportColumns";
export type { Category, Expense } from "@/components/gastos/types";

export default function GastosPage() {
  return <GastosContent />;
}

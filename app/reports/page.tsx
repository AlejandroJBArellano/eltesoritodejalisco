"use client";

import { ReportsContent } from "@/components/reports/ReportsContent";

export {
  DAILY_SALES_EXPORT_COLUMNS,
  PRODUCT_SALES_EXPORT_COLUMNS,
} from "@/components/reports/exportColumns";

export type {
  DailySaleExportItem,
  EnrichedProductSaleItem,
} from "@/components/reports/types";

export default function ReportsPage() {
  return <ReportsContent />;
}

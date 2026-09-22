import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { getMexicoDateStr } from "@/lib/services/reports";
import {
  aggregateHourlySales,
  type HourlySalesRow,
} from "@/lib/services/hourlyAnalytics";
import { redirect } from "next/navigation";
import React from "react";
import {
  InventoryAlertBanner,
  DailyStatsSection,
  TodaySalesChart,
  OperationSection,
  ManagementSection,
  FinanceSection,
  type LowStockIngredient,
  type DashboardStats,
} from "@/components/dashboard";

export default async function Home() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  // Redirección automática para el Chef
  if (profile.role === "CHEF") {
    redirect("/kitchen");
  }

  const isAdmin = profile.role === "ADMIN" || profile.role === "MANAGER";
  const isInventory = profile.role === "INVENTORY";

  const tenant = await getTenantContext();
  let lowStockAlerts: LowStockIngredient[] = [];
  let hourlyRows: HourlySalesRow[] = [];
  const stats: DashboardStats = {
    activeOrdersCount: 0,
    salesToday: 0,
    customersCount: 0,
    tipsToday: 0,
  };

  if (isAdmin || isInventory) {
    const supabase = await createClient();
    const todayStr = getMexicoDateStr(new Date());
    const todayStartIso = `${todayStr}T00:00:00-06:00`;

    const [statsResult, ingredientsResult, todayOrdersResult] =
      await Promise.all([
        isAdmin
          ? supabase.rpc("get_dashboard_stats", { p_tenant_id: tenant.id })
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("ingredients")
          .select("id, name, current_stock, minimum_stock, unit")
          .eq("tenant_id", tenant.id)
          .order("current_stock", { ascending: true }),
        isAdmin
          ? supabase
              .from("orders")
              .select("id, total, created_at, status, is_paid")
              .eq("tenant_id", tenant.id)
              .gte("created_at", todayStartIso)
          : Promise.resolve({ data: null, error: null }),
      ]);

    // Filter low/out-of-stock client-side (Supabase can't filter WHERE col1 <= col2 without RPC)
    lowStockAlerts = (ingredientsResult.data || []).filter(
      (ing) => ing.current_stock <= ing.minimum_stock,
    );

    if (
      isAdmin &&
      !statsResult.error &&
      statsResult.data &&
      statsResult.data.length > 0
    ) {
      const s = statsResult.data[0];
      stats.activeOrdersCount = Number(s.active_orders || 0);
      stats.salesToday = Number(s.sales_today || 0);
      stats.tipsToday = Number(s.tips_today || 0);
      stats.customersCount = Number(s.customers_count || 0);
    }

    if (isAdmin && todayOrdersResult?.data) {
      const { rows: calculatedRows } = aggregateHourlySales(
        todayOrdersResult.data.map((o) => ({
          id: o.id,
          total: o.total,
          created_at: o.created_at,
          completed_at: null,
          source: null,
          status: o.status,
        })),
      );
      hourlyRows = calculatedRows;
    }
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8 space-y-6">
        {(isAdmin || isInventory) && (
          <InventoryAlertBanner alerts={lowStockAlerts} />
        )}

        {isAdmin && (
          <TodaySalesChart
            hourlyRows={hourlyRows}
            salesToday={stats.salesToday}
            ordersCount={stats.activeOrdersCount}
            tipsToday={stats.tipsToday}
          />
        )}

        {isAdmin && <DailyStatsSection stats={stats} />}

        <OperationSection />

        <ManagementSection />

        <FinanceSection />
      </main>
    </div>
  );
}

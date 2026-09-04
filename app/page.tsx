import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { redirect } from "next/navigation";
import React from "react";
import {
  InventoryAlertBanner,
  DailyStatsSection,
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

  const tenant = await getTenantContext();
  let lowStockAlerts: LowStockIngredient[] = [];
  const stats: DashboardStats = {
    activeOrdersCount: 0,
    salesToday: 0,
    customersCount: 0,
    tipsToday: 0,
  };

  if (isAdmin) {
    const supabase = await createClient();

    const [statsResult, ingredientsResult] = await Promise.all([
      supabase.rpc("get_dashboard_stats", { p_tenant_id: tenant.id }),
      supabase
        .from("ingredients")
        .select("id, name, current_stock, minimum_stock, unit")
        .eq("tenant_id", tenant.id)
        .order("current_stock", { ascending: true }),
    ]);

    // Filter low/out-of-stock client-side (Supabase can't filter WHERE col1 <= col2 without RPC)
    lowStockAlerts = (ingredientsResult.data || []).filter(
      (ing) => ing.current_stock <= ing.minimum_stock,
    );

    if (!statsResult.error && statsResult.data && statsResult.data.length > 0) {
      const s = statsResult.data[0];
      stats.activeOrdersCount = Number(s.active_orders || 0);
      stats.salesToday = Number(s.sales_today || 0);
      stats.tipsToday = Number(s.tips_today || 0);
      stats.customersCount = Number(s.customers_count || 0);
    }
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-12 sm:px-6 lg:px-8 space-y-6">
        {isAdmin && <InventoryAlertBanner alerts={lowStockAlerts} />}

        {isAdmin && <DailyStatsSection stats={stats} />}

        <OperationSection />

        <ManagementSection />

        <FinanceSection />
      </main>
    </div>
  );
}

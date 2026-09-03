"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { FacturacionModal } from "@/components/pos/FacturacionModal";
import { createClient } from "@/lib/supabase/client";

import { HistoryProvider, useHistoryContext } from "./HistoryContext";
import { DailyCutBanner } from "./DailyCutBanner";
import { DailyCutsArchiveTable } from "./DailyCutsArchiveTable";
import { FinalizeCutModal } from "./FinalizeCutModal";
import { HistoryCharts } from "./HistoryCharts";
import { OrdersFilterBar } from "./OrdersFilterBar";
import { OrdersHistoryTable } from "./OrdersHistoryTable";

function HistoryMainView() {
  const { showCutsArchive, billingOrder, setBillingOrder, isLoadingOrders } =
    useHistoryContext();

  if (isLoadingOrders) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <p className="text-text-light/60 font-bold text-sm">
          Cargando historial y datos...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-light">
      <PageHeader
        title="Historial de Ventas"
        subtitle="Métricas financieras, corte de caja y registro histórico de órdenes."
        backHref="/"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* CORTE DE CAJA DIARIO & KPIS (0 PROPS) */}
        <DailyCutBanner />

        {/* ARCHIVO HISTÓRICO DE CORTES AUTOCONTENIDO (0 PROPS) */}
        {showCutsArchive && <DailyCutsArchiveTable />}

        {/* GRÁFICAS FINANCIERAS (0 PROPS) */}
        <HistoryCharts />

        {/* TABLA DE ÓRDENES Y FILTROS (0 PROPS) */}
        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-6">
          <OrdersFilterBar />
          <OrdersHistoryTable />
        </section>
      </main>

      {/* MODAL DE CIERRE DE CAJA (0 PROPS) */}
      <FinalizeCutModal />

      {/* MODAL DE FACTURACIÓN */}
      {billingOrder && (
        <FacturacionModal
          order={billingOrder}
          onClose={() => setBillingOrder(null)}
        />
      )}
    </div>
  );
}

export function HistoryContent() {
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkRole = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const tenantRes = await fetch("/api/tenant");
        if (tenantRes.ok) {
          const { tenant } = await tenantRes.json();
          if (tenant) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .eq("tenant_id", tenant.id)
              .single();
            setUserRole(profile?.role || null);
          }
        }
      }
    } catch (error) {
      console.error("Error checking role:", error);
    } finally {
      setIsCheckingRole(false);
    }
  }, []);

  useEffect(() => {
    void checkRole();
  }, [checkRole]);

  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <p className="text-text-light/60 font-bold text-sm">
          Verificando permisos...
        </p>
      </div>
    );
  }

  if (userRole === "WAITER") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="bg-card p-8 rounded-2xl shadow-xl border border-red-500/20 max-w-md w-full text-center space-y-4">
          <div className="rounded-2xl bg-red-500/10 p-4 text-red-400 w-16 h-16 mx-auto flex items-center justify-center">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-text-light tracking-tight uppercase">
            Acceso Denegado
          </h1>
          <p className="text-sm text-text-light/60 leading-relaxed font-medium">
            El rol de <strong className="text-text-light">MESERO</strong> no
            cuenta con permisos para acceder al historial ni estadísticas
            financieras.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#E0E0E0] text-black rounded-xl font-black text-sm uppercase tracking-wider hover:bg-white transition-all shadow-md"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <HistoryProvider>
      <HistoryMainView />
    </HistoryProvider>
  );
}

export default HistoryContent;

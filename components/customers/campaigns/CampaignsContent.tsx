"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Mail, Plus, ArrowLeft, Send, Users, TrendingUp } from "lucide-react";
import {
  CampaignsHistoryTable,
  type CampaignWithRecipients,
} from "./CampaignsHistoryTable";
import { NewCampaignModal } from "./NewCampaignModal";

interface CampaignsStats {
  totalCampaigns: number;
  totalSent: number;
  totalFailed: number;
  uniqueCustomersReached: number;
  successRate: number;
}

interface CampaignsContentProps {
  initialCampaigns: CampaignWithRecipients[];
  initialStats: CampaignsStats;
}

export function CampaignsContent({
  initialCampaigns,
  initialStats,
}: CampaignsContentProps) {
  const [campaigns, setCampaigns] =
    useState<CampaignWithRecipients[]>(initialCampaigns);
  const [stats, setStats] = useState<CampaignsStats>(initialStats);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/customers/campaigns");
      if (!res.ok) throw new Error("Error al obtener campañas");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-text-light">
      <PageHeader
        title="Campañas & Fidelización"
        subtitle="Envío segmentado de correos de lealtad y reactivación"
        badgeColor="bg-emerald-500"
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/customers"
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-text-light hover:bg-white/5 active:scale-95 transition-all duration-200 uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <ArrowLeft className="h-4 w-4 text-text-light/60" />
              Directorio
            </Link>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-black hover:brightness-105 active:scale-95 transition-all duration-200 uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              data-testid="new-campaign-header-btn"
            >
              <Plus className="h-4 w-4" />
              Nueva Campaña
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* KPI CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-card p-5 border border-border flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Total Campañas
              </p>
              <p className="mt-1 text-2xl font-black text-text-light font-mono tabular-nums">
                {stats.totalCampaigns}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
              <Mail className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 border border-border flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Correos Enviados
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400 font-mono tabular-nums">
                {stats.totalSent}
              </p>
              {stats.totalFailed > 0 && (
                <p className="text-[10px] font-bold text-red-400 mt-0.5 font-mono tabular-nums">
                  {stats.totalFailed} fallidos
                </p>
              )}
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-blue-400">
              <Send className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 border border-border flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Efectividad
              </p>
              <p className="mt-1 text-2xl font-black text-purple-400 font-mono tabular-nums">
                {stats.successRate}%
              </p>
            </div>
            <div className="rounded-lg bg-purple-500/10 p-3 text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl bg-card p-5 border border-border flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Clientes Alcanzados
              </p>
              <p className="mt-1 text-2xl font-black text-amber-400 font-mono tabular-nums">
                {stats.uniqueCustomersReached}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3 text-amber-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* TABLA DE HISTORIAL */}
        <CampaignsHistoryTable
          campaigns={campaigns}
          isLoading={isLoading}
          onRefresh={fetchCampaigns}
        />
      </main>

      {/* MODAL NUEVA CAMPAÑA */}
      <NewCampaignModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={fetchCampaigns}
      />
    </div>
  );
}

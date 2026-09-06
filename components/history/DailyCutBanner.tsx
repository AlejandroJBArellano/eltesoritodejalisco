"use client";

import React from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Folder,
  Home,
  Receipt,
  TrendingUp,
  X,
} from "lucide-react";
import { useHistoryContextNullable } from "./HistoryContext";
import type { DailyCutSummaryTotals } from "./types";

export interface DailyCutBannerProps {
  todayTotals?: DailyCutSummaryTotals;
  todayOrdersCount?: number;
  todayExpenses?: number;
  finalizeSuccess?: boolean;
  hasPendingCut?: boolean;
  pendingDate?: string | null;
  pendingOrders?: number;
  pendingCutArmed?: boolean;
  isGeneratingPendingCut?: boolean;
  showCutsArchive?: boolean;
  historyError?: string | null;
  historySuccess?: string | null;
  onFinalizeDayClick?: () => void;
  onToggleCutsArchive?: () => void;
  onGeneratePendingCut?: () => void;
  onDismissError?: () => void;
}

export function DailyCutBanner(props: DailyCutBannerProps = {}) {
  const context = useHistoryContextNullable();

  const todayTotals = props.todayTotals ?? context?.todayTotals ?? {
    ventaNeta: 0,
    ivaAcumulado: 0,
    propinasEfectivo: 0,
    propinasTarjeta: 0,
    cajaEfectivo: 0,
    cajaTarjeta: 0,
    comisionTarjeta: 0,
    cajaTarjetaNeta: 0,
    utilidadReal: 0,
    utilidadFinal: 0,
    ordersAtTable: 0,
    ordersDelivery: 0,
    averageTicket: 0,
    creditoOtorgadoHoy: 0,
  };
  const todayOrdersCount = props.todayOrdersCount ?? context?.todayOrders.length ?? 0;
  const todayExpenses = props.todayExpenses ?? context?.todayExpenses ?? 0;
  const finalizeSuccess = props.finalizeSuccess ?? context?.finalizeSuccess ?? false;
  const hasPendingCut = props.hasPendingCut ?? context?.hasPendingCut ?? false;
  const pendingDate = props.pendingDate !== undefined ? props.pendingDate : (context?.pendingDate ?? null);
  const pendingOrders = props.pendingOrders ?? context?.pendingOrders ?? 0;
  const pendingCutArmed = props.pendingCutArmed ?? context?.pendingCutArmed ?? false;
  const isGeneratingPendingCut = props.isGeneratingPendingCut ?? context?.isGeneratingPendingCut ?? false;
  const showCutsArchive = props.showCutsArchive ?? context?.showCutsArchive ?? false;
  const historyError = props.historyError !== undefined ? props.historyError : (context?.historyError ?? null);
  const historySuccess = props.historySuccess !== undefined ? props.historySuccess : (context?.historySuccess ?? null);

  const onFinalizeDayClick = props.onFinalizeDayClick ?? context?.openFinalizeModal ?? (() => {});
  const onToggleCutsArchive = props.onToggleCutsArchive ?? context?.toggleCutsArchive ?? (() => {});
  const onGeneratePendingCut = props.onGeneratePendingCut ?? context?.handleGeneratePendingCut ?? (() => {});
  const onDismissError = props.onDismissError ?? (() => context?.setHistoryError(null));

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-6">
      {/* ALERTA CORTE PENDIENTE */}
      {hasPendingCut && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-300 uppercase tracking-wider text-xs">
                  Corte Pendiente Detectado ({pendingDate})
                </p>
                <p className="text-text-light/70 text-[11px] mt-0.5">
                  Hay {pendingOrders} orden(es) de ayer sin corte. Puedes
                  generar el corte extemporáneo para cerrar el ciclo previo.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGeneratePendingCut}
              disabled={isGeneratingPendingCut}
              className={`px-3 py-2 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all shrink-0 ${
                pendingCutArmed
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
              }`}
            >
              {isGeneratingPendingCut
                ? "Generando..."
                : pendingCutArmed
                  ? "¿Confirmar corte pendiente?"
                  : "Cerrar Ayer Ahora"}
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACK INLINE */}
      {historyError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center justify-between">
          <span>{historyError}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="text-red-400 hover:text-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {historySuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{historySuccess}</span>
        </div>
      )}

      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Corte de Caja Diario
          </h2>
          <p className="text-xs text-text-light/50 font-medium mt-0.5">
            Métricas acumuladas del turno activo en curso
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onToggleCutsArchive}
            className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
              showCutsArchive
                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                : "bg-white/5 text-text-light/70 border-border hover:bg-white/10"
            }`}
          >
            <Folder className="h-4 w-4" />
            {showCutsArchive ? "Ocultar Archivo" : "Archivo de Cortes"}
          </button>

          {!finalizeSuccess && (
            <button
              type="button"
              onClick={onFinalizeDayClick}
              className="rounded-xl bg-success px-4 py-2 text-xs font-black text-white hover:brightness-110 transition-all uppercase tracking-wider shadow-lg shadow-success/20 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar Día
            </button>
          )}
        </div>
      </div>

      {/* METRICAS / CUADRÍCULA */}
      {finalizeSuccess ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Venta Neta Total (Sin IVA)
              </span>
              <span className="text-text-light/40 text-xl font-mono">$0.00</span>
            </div>
            <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                IVA Acumulado
              </span>
              <span className="text-text-light/40 text-xl font-mono">$0.00</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Propinas (Efectivo)
              </span>
              <span className="text-text-light/40 text-xl font-mono">$0.00</span>
            </div>
            <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Propinas (Tarjeta)
              </span>
              <span className="text-text-light/40 text-xl font-mono">$0.00</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-dark/40 p-3.5 rounded-xl border border-emerald-500/20">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Caja Final (Efectivo)
              </span>
              <span className="text-text-light/40 text-xl font-mono">$0.00</span>
            </div>
            <div className="bg-dark/40 p-3.5 rounded-xl border border-blue-500/20">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Caja Final (Tarjeta)
              </span>
              <span className="text-text-light/40 text-xl font-mono">$0.00</span>
            </div>
          </div>
          <div className="bg-emerald-500/10 p-5 rounded-2xl flex flex-col justify-center items-center border border-emerald-500/20 lg:col-span-1 md:col-span-2">
            <span className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Día Finalizado
            </span>
            <span className="text-text-light text-3xl font-black font-mono">
              $0.00
            </span>
            <span className="text-emerald-400/60 text-[10px] font-bold mt-1 text-center uppercase tracking-widest">
              Nuevo ciclo — caja en cero
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-3">
            <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Venta Neta (Sin IVA)
              </span>
              <span className="text-text-light text-xl font-mono font-bold">
                ${todayTotals.ventaNeta.toFixed(2)}
              </span>
            </div>
            <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                IVA Acumulado
              </span>
              <span className="text-amber-400 text-xl font-mono">
                ${todayTotals.ivaAcumulado.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Propinas (Efectivo)
              </span>
              <span className="text-emerald-400 text-xl font-mono font-bold">
                ${todayTotals.propinasEfectivo.toFixed(2)}
              </span>
            </div>
            <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Propinas (Tarjeta)
              </span>
              <span className="text-blue-400 text-xl font-mono font-bold">
                ${todayTotals.propinasTarjeta.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-dark/40 p-3.5 rounded-xl border border-emerald-500/20">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Caja Final (Efectivo)
              </span>
              <span className="text-emerald-400 text-xl font-mono font-black">
                ${todayTotals.cajaEfectivo.toFixed(2)}
              </span>
            </div>
            <div className="bg-dark/40 p-3.5 rounded-xl border border-blue-500/20">
              <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Caja Final (Tarjeta)
              </span>
              <span className="text-blue-400 text-xl font-mono font-black">
                ${todayTotals.cajaTarjeta.toFixed(2)}
              </span>
              {todayTotals.comisionTarjeta > 0 && (
                <span className="text-[10px] text-blue-300/70 font-mono block mt-1">
                  Comisión: -${todayTotals.comisionTarjeta.toFixed(2)} · Neto: ${todayTotals.cajaTarjetaNeta.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="bg-dark/40 p-4 rounded-xl border border-red-500/20 flex flex-col justify-center">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              Gastos del Día
            </span>
            <span className="text-red-400 text-2xl font-mono font-black">
              -${todayExpenses.toFixed(2)}
            </span>
            <span className="text-text-light/40 text-[10px] mt-1 uppercase font-bold">
              Insumos, sueldos, etc.
            </span>
          </div>

          <div className="bg-blue-950/30 p-4 rounded-2xl flex flex-col justify-center items-center shadow-lg border border-blue-500/30">
            <span className="text-blue-300 text-[10px] font-black uppercase tracking-widest mb-1">
              Utilidad Real
            </span>
            <span className="text-text-light text-2xl font-black font-mono">
              ${todayTotals.utilidadReal.toFixed(2)}
            </span>
            <div className="mt-2 pt-2 border-t border-blue-500/20 w-full text-center">
              <span className="text-blue-300 text-[10px] font-black uppercase tracking-widest block mb-0.5">
                Utilidad Final
              </span>
              <span
                className={`text-xl font-black font-mono ${
                  todayTotals.utilidadFinal >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                ${todayTotals.utilidadFinal.toFixed(2)}
              </span>
              <span className="text-text-light/40 text-[9px] mt-0.5 block uppercase tracking-wider">
                {todayTotals.comisionTarjeta > 0
                  ? "(Menos gastos y comisión)"
                  : "(Menos gastos)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CRÉDITOS OTORGADOS HOY (INFORMATIVO) */}
      {!finalizeSuccess && todayTotals.creditoOtorgadoHoy > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <span className="font-black text-violet-300 uppercase tracking-wider text-xs block">
                Créditos Otorgados Hoy (Cuentas por Cobrar)
              </span>
              <span className="text-text-light/60 text-[11px]">
                Ventas pendientes de cobro · No computan en caja hasta que el cliente liquide o abone
              </span>
            </div>
          </div>
          <div className="text-right sm:self-center">
            <span className="text-violet-300 text-xl font-black font-mono">
              ${todayTotals.creditoOtorgadoHoy.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* RESUMEN OPERATIVO */}
      {!finalizeSuccess && todayOrdersCount > 0 && (
        <div className="pt-4 border-t border-border space-y-3">
          <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Resumen Operativo del Día
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark/40 p-4 rounded-xl border border-border flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                  Folios Generados
                </p>
                <p className="text-lg font-black text-text-light">
                  {todayOrdersCount}{" "}
                  <span className="text-xs font-normal text-blue-400">
                    órdenes hoy
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-dark/40 p-4 rounded-xl border border-border flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                  Mesa vs Domicilio
                </p>
                <p className="text-base font-black text-text-light">
                  {todayTotals.ordersAtTable}{" "}
                  <span className="text-[10px] text-text-light/50 font-normal">
                    Mesa
                  </span>
                  <span className="mx-2 text-text-light/20">|</span>
                  {todayTotals.ordersDelivery}{" "}
                  <span className="text-[10px] text-text-light/50 font-normal">
                    Domicilio
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-dark/40 p-4 rounded-xl border border-border flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                  Consumo Promedio
                </p>
                <p className="text-lg font-black text-emerald-400">
                  ${todayTotals.averageTicket.toFixed(2)}{" "}
                  <span className="text-[10px] text-text-light/50 font-normal">
                    por orden
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

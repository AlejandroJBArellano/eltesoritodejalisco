"use client";

import React from "react";
import { CheckCircle2, Printer, X } from "lucide-react";
import { useHistoryContextNullable } from "./HistoryContext";
import type { DailyCutSummaryTotals, TipBreakdownItem } from "./types";

export interface FinalizeCutModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  onPrintClosingTicket?: () => void;
  isFinalizing?: boolean;
  todayTotals?: DailyCutSummaryTotals;
  todayOrdersCount?: number;
  todayExpenses?: number;
  manualCash?: string;
  manualCard?: string;
  manualTipsEfectivo?: string;
  manualTipsTarjeta?: string;
  onManualCashChange?: (val: string) => void;
  onManualCardChange?: (val: string) => void;
  onManualTipsEfectivoChange?: (val: string) => void;
  onManualTipsTarjetaChange?: (val: string) => void;
  isCalculatingTips?: boolean;
  tipBreakdown?: TipBreakdownItem[];
  terminalCommissionRate?: number;
}

export function FinalizeCutModal(props: FinalizeCutModalProps = {}) {
  const context = useHistoryContextNullable();

  const isOpen = props.isOpen !== undefined ? props.isOpen : (context?.showFinalizeModal ?? false);
  const onClose = props.onClose ?? (() => context?.setShowFinalizeModal(false));
  const onConfirm = props.onConfirm ?? (() => context?.handleFinalizarDia());
  const onPrintClosingTicket = props.onPrintClosingTicket ?? (() => context?.openDailySummaryTicket());
  const isFinalizing = props.isFinalizing !== undefined ? props.isFinalizing : (context?.isFinalizing ?? false);

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
  const terminalCommissionRate = props.terminalCommissionRate !== undefined
    ? props.terminalCommissionRate
    : (context?.terminalCommissionRate ?? 0);

  const manualCash = props.manualCash !== undefined ? props.manualCash : (context?.manualCash ?? "");
  const manualCard = props.manualCard !== undefined ? props.manualCard : (context?.manualCard ?? "");
  const manualTipsEfectivo = props.manualTipsEfectivo !== undefined ? props.manualTipsEfectivo : (context?.manualTipsEfectivo ?? "");
  const manualTipsTarjeta = props.manualTipsTarjeta !== undefined ? props.manualTipsTarjeta : (context?.manualTipsTarjeta ?? "");

  const onManualCashChange = props.onManualCashChange ?? context?.setManualCash ?? (() => {});
  const onManualCardChange = props.onManualCardChange ?? context?.setManualCard ?? (() => {});
  const onManualTipsEfectivoChange = props.onManualTipsEfectivoChange ?? context?.setManualTipsEfectivo ?? (() => {});
  const onManualTipsTarjetaChange = props.onManualTipsTarjetaChange ?? context?.setManualTipsTarjeta ?? (() => {});

  const isCalculatingTips = props.isCalculatingTips !== undefined ? props.isCalculatingTips : (context?.isCalculatingTips ?? false);
  const tipBreakdown = props.tipBreakdown ?? context?.tipBreakdown ?? [];

  const currentCard = manualCard !== "" ? Number(manualCard) : todayTotals.cajaTarjeta;
  const currentCommission = (currentCard * terminalCommissionRate) / 100;
  const currentNetCard = Math.max(0, currentCard - currentCommission);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-emerald-500/30 space-y-5">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Finalizar Día
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-light/40 hover:text-text-light transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs font-medium text-text-light/60">
          Se guardará el resumen financiero en el archivo de cortes y se
          iniciará un nuevo ciclo.
        </p>

        <div className="space-y-3 bg-dark/40 rounded-xl p-4 border border-border text-xs">
          <div className="flex justify-between items-center bg-card p-2.5 rounded-lg border border-border">
            <span className="text-text-light/60 font-bold">
              Venta Neta (sin IVA)
            </span>
            <span className="text-text-light font-mono font-black">
              ${todayTotals.ventaNeta.toFixed(2)}
            </span>
          </div>

          {todayTotals.creditoOtorgadoHoy > 0 && (
            <div className="flex justify-between items-center bg-violet-500/10 p-2.5 rounded-lg border border-violet-500/20">
              <span className="text-violet-300 font-bold">
                Crédito otorgado hoy
              </span>
              <span className="text-violet-300 font-mono font-black">
                ${todayTotals.creditoOtorgadoHoy.toFixed(2)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[10px] text-text-light/50 uppercase font-black mb-1 block">
                Efectivo Caja
              </label>
              <input
                type="number"
                value={manualCash}
                onChange={(e) => onManualCashChange(e.target.value)}
                className="w-full bg-dark/40 border border-border rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold focus:border-emerald-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-light/50 uppercase font-black mb-1 block">
                Tarjeta Caja
              </label>
              <input
                type="number"
                value={manualCard}
                onChange={(e) => onManualCardChange(e.target.value)}
                className="w-full bg-dark/40 border border-border rounded-lg px-2.5 py-1.5 text-blue-400 font-mono font-bold focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-light/50 uppercase font-black mb-1 block">
                Propinas Efec.
              </label>
              <input
                type="number"
                value={manualTipsEfectivo}
                onChange={(e) => onManualTipsEfectivoChange(e.target.value)}
                className="w-full bg-dark/40 border border-border rounded-lg px-2.5 py-1.5 text-emerald-400/80 font-mono font-bold focus:border-emerald-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-light/50 uppercase font-black mb-1 block">
                Propinas Tarj.
              </label>
              <input
                type="number"
                value={manualTipsTarjeta}
                onChange={(e) => onManualTipsTarjetaChange(e.target.value)}
                className="w-full bg-dark/40 border border-border rounded-lg px-2.5 py-1.5 text-blue-400/80 font-mono font-bold focus:border-blue-400 outline-none"
              />
            </div>
          </div>

          {terminalCommissionRate > 0 && (
            <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg text-xs">
              <div className="flex flex-col">
                <span className="text-blue-300 font-bold">
                  Comisión ({terminalCommissionRate.toFixed(2)}%)
                </span>
                <span className="text-[10px] text-blue-300/70 font-mono">
                  Neto: ${currentNetCard.toFixed(2)}
                </span>
              </div>
              <span className="text-blue-300 font-mono font-black">
                -${currentCommission.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between border-t border-border pt-2 text-text-light/60">
            <span>Órdenes completadas</span>
            <span className="text-text-light font-bold">
              {todayOrdersCount}
            </span>
          </div>
          <div className="flex justify-between text-text-light/60">
            <span>Gastos del Día</span>
            <span className="text-red-400 font-mono font-bold">
              -${todayExpenses.toFixed(2)}
            </span>
          </div>
        </div>

        {/* DISTRIBUCIÓN DE PROPINAS */}
        <div className="bg-dark/40 p-4 rounded-xl border border-border space-y-2">
          <h4 className="text-xs font-black text-text-light uppercase tracking-wider flex items-center justify-between">
            <span>Distribución de Propinas</span>
            {isCalculatingTips && (
              <span className="text-[10px] text-blue-400">Calculando...</span>
            )}
          </h4>
          {!isCalculatingTips && tipBreakdown.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] text-text-light/40 font-extrabold uppercase tracking-widest border-b border-border pb-1">
                <span>Empleado</span>
                <span>Horas</span>
                <span>Monto</span>
              </div>
              {tipBreakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-text-light/80 font-bold">
                    {item.employee_name}
                  </span>
                  <span className="text-text-light/50 font-mono">
                    {item.hours_worked.toFixed(2)}h
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ${item.tip_amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : !isCalculatingTips ? (
            <p className="text-[11px] text-text-light/40 italic">
              No hay registros de asistencia finalizados hoy.
            </p>
          ) : null}
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => onPrintClosingTicket()}
            className="w-full bg-blue-600/20 text-blue-300 border border-blue-500/30 py-2.5 rounded-xl font-black hover:bg-blue-600/30 transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Imprimir Ticket de Cierre
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isFinalizing}
            className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isFinalizing}
            className="w-full bg-success text-white py-3 rounded-xl font-black hover:brightness-110 transition-all uppercase text-xs tracking-wider shadow-lg shadow-success/20 disabled:opacity-50 cursor-pointer"
          >
            {isFinalizing ? "Guardando..." : "Confirmar y Finalizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

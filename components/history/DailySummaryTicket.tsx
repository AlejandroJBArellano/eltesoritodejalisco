"use client";

import React, { useMemo } from "react";
import { useOptionalTenant } from "@/components/TenantProvider";
import type { TenantContextType } from "@/lib/tenant";
import { getOrderTipAmount, getOrderPaymentLabel } from "@/components/pos/paymentUtils";
import { formatServiceTicket } from "@/lib/utils/serviceType";
import { PaymentMethod } from "@/types";
import type {
  DailyCut,
  DailyCutSummaryTotals,
  ExpenseDetailItem,
  Order,
  TipBreakdownItem,
} from "./types";

export interface DailySummaryTicketProps {
  todayTotals?: DailyCutSummaryTotals;
  orders?: Order[];
  expenses?: number;
  expensesDetail?: ExpenseDetailItem[] | null;
  tipBreakdown?: TipBreakdownItem[];
  tenantContext?: Partial<TenantContextType> | null;
  cut?: DailyCut | null;
  emissionDate?: Date;
}

export function DailySummaryTicket({
  todayTotals,
  orders = [],
  expenses = 0,
  expensesDetail,
  tipBreakdown = [],
  tenantContext,
  cut,
  emissionDate = new Date(),
}: DailySummaryTicketProps) {
  const contextTenant = useOptionalTenant();
  const tenant = tenantContext ?? contextTenant;

  const tenantName = tenant?.name || "KITTN RESTAURANTE";
  const rfc = tenant?.rfc;
  const postalCode = tenant?.postal_code;
  const regimenFiscal = tenant?.regimen_fiscal;

  // Si se proporciona un corte archivado, usamos sus cifras
  const isHistorical = Boolean(cut);

  const totalOrdersCount = isHistorical
    ? Number(cut?.total_orders ?? 0)
    : (orders.length || (todayTotals?.ordersAtTable || 0) + (todayTotals?.ordersDelivery || 0));

  const ventaNeta = isHistorical
    ? Number(cut?.venta_neta ?? 0)
    : Number(todayTotals?.ventaNeta ?? 0);

  const ivaAcumulado = isHistorical
    ? Number(cut?.iva_acumulado ?? 0)
    : Number(todayTotals?.ivaAcumulado ?? 0);

  const ventaBruta = ventaNeta + ivaAcumulado;

  const cajaEfectivo = isHistorical
    ? Number(cut?.caja_efectivo ?? 0)
    : Number(todayTotals?.cajaEfectivo ?? 0);

  const cajaTarjeta = isHistorical
    ? Number(cut?.caja_tarjeta ?? 0)
    : Number(todayTotals?.cajaTarjeta ?? 0);

  const comisionTarjeta = isHistorical
    ? Number(cut?.comision_tarjeta ?? 0)
    : Number(todayTotals?.comisionTarjeta ?? 0);

  const cajaTarjetaNeta = Math.max(0, cajaTarjeta - comisionTarjeta);

  const propinasEfectivo = isHistorical
    ? Number(cut?.propinas_efectivo ?? 0)
    : Number(todayTotals?.propinasEfectivo ?? 0);

  const propinasTarjeta = isHistorical
    ? Number(cut?.propinas_tarjeta ?? 0)
    : Number(todayTotals?.propinasTarjeta ?? 0);

  const propinasTotales = propinasEfectivo + propinasTarjeta;

  const totalGastos = isHistorical
    ? Number(cut?.total_gastos ?? 0)
    : Number(expenses || 0);

  const resolvedExpensesDetail = isHistorical
    ? cut?.expenses_detail
    : expensesDetail;

  const utilidadFinal = isHistorical
    ? Number(cut?.utilidad_final ?? 0)
    : Number(todayTotals?.utilidadFinal ?? (ventaNeta + propinasTotales - totalGastos - comisionTarjeta));

  // Desglose por método de pago a partir de órdenes si están disponibles
  const paymentBreakdown = useMemo(() => {
    let transfer = 0;
    let other = 0;

    orders.forEach((order) => {
      (order.payments || []).forEach((p) => {
        const amt = Number(p.amount || 0) + Number(p.tipAmount || 0);
        if (p.method === PaymentMethod.TRANSFER) {
          transfer += amt;
        } else if (p.method === PaymentMethod.OTHER) {
          other += amt;
        }
      });
    });

    return { transfer, other };
  }, [orders]);

  const formattedCutDate = useMemo(() => {
    if (cut?.cut_date) {
      return new Date(`${cut.cut_date}T12:00:00`).toLocaleDateString("es-MX", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "America/Mexico_City",
      });
    }
    return emissionDate.toLocaleDateString("es-MX", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "America/Mexico_City",
    });
  }, [cut, emissionDate]);

  const formattedEmissionTime = useMemo(() => {
    return emissionDate.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Mexico_City",
    });
  }, [emissionDate]);

  const formatCurrency = (val: number) => `$${Number(val || 0).toFixed(2)}`;

  return (
    <div
      data-testid="daily-summary-ticket"
      className="daily-summary-ticket-container bg-white p-4 w-[80mm] mx-auto text-black font-mono text-xs border shadow-sm"
    >
      {/* 1. ENCABEZADO INSTITUCIONAL */}
      <div className="text-center mb-3">
        <h2 className="text-base font-bold uppercase tracking-tight">{tenantName}</h2>
        {rfc && <p className="text-[11px]">RFC: {rfc}</p>}
        {postalCode && <p className="text-[11px]">C.P.: {postalCode}</p>}
        {regimenFiscal && <p className="text-[11px]">Régimen: {regimenFiscal}</p>}
        <div className="border-b border-dashed my-2"></div>
        <p className="font-bold text-xs uppercase tracking-wide">
          *** CORTE / RESUMEN DE CAJA DIARIO ***
        </p>
        <div className="border-b border-dashed my-2"></div>
      </div>

      {/* METADATOS DE JORNADA */}
      <div className="mb-3 space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="font-bold">FECHA OPERATIVA:</span>
          <span className="uppercase">{formattedCutDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">HORA EMISIÓN:</span>
          <span>{formattedEmissionTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">ÓRDENES COBRADAS:</span>
          <span className="font-bold">{totalOrdersCount}</span>
        </div>
      </div>

      <div className="border-b border-dashed my-2"></div>

      {/* 2. RESUMEN FINANCIERO GLOBAL (KPIS & ARQUEO) */}
      <div className="mb-3 space-y-1 text-[11px]">
        <p className="font-bold uppercase text-center text-xs mb-1">
          RESUMEN FINANCIERO
        </p>
        <div className="flex justify-between">
          <span>VENTA NETA (SIN IVA):</span>
          <span className="font-bold">{formatCurrency(ventaNeta)}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA ACUMULADO (16%):</span>
          <span>{formatCurrency(ivaAcumulado)}</span>
        </div>
        <div className="flex justify-between border-t border-dotted pt-1 font-bold">
          <span>VENTA BRUTA TOTAL:</span>
          <span>{formatCurrency(ventaBruta)}</span>
        </div>

        <div className="border-b border-dashed my-2"></div>

        <p className="font-bold uppercase text-center text-xs mb-1">
          ARQUEO DE COBROS
        </p>
        <div className="flex justify-between">
          <span>EFECTIVO RECAUDADO:</span>
          <span className="font-bold">{formatCurrency(cajaEfectivo)}</span>
        </div>
        <div className="flex justify-between">
          <span>TARJETA (BRUTO):</span>
          <span>{formatCurrency(cajaTarjeta)}</span>
        </div>
        {comisionTarjeta > 0 && (
          <div className="flex justify-between text-[10px] pl-2 text-gray-700">
            <span>- COMISIÓN ESTIMADA:</span>
            <span>-{formatCurrency(comisionTarjeta)}</span>
          </div>
        )}
        {comisionTarjeta > 0 && (
          <div className="flex justify-between text-[10px] pl-2 font-bold">
            <span>TARJETA (NETO):</span>
            <span>{formatCurrency(cajaTarjetaNeta)}</span>
          </div>
        )}
        {paymentBreakdown.transfer > 0 && (
          <div className="flex justify-between">
            <span>TRANSFERENCIA:</span>
            <span>{formatCurrency(paymentBreakdown.transfer)}</span>
          </div>
        )}
        {paymentBreakdown.other > 0 && (
          <div className="flex justify-between">
            <span>OTROS MÉTODOS:</span>
            <span>{formatCurrency(paymentBreakdown.other)}</span>
          </div>
        )}

        <div className="border-b border-dashed my-2"></div>

        <p className="font-bold uppercase text-center text-xs mb-1">
          PROPINAS & GASTOS
        </p>
        <div className="flex justify-between">
          <span>PROPINAS EFECTIVO:</span>
          <span>{formatCurrency(propinasEfectivo)}</span>
        </div>
        <div className="flex justify-between">
          <span>PROPINAS TARJETA:</span>
          <span>{formatCurrency(propinasTarjeta)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>TOTAL PROPINAS:</span>
          <span>{formatCurrency(propinasTotales)}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span>GASTOS DEL DÍA:</span>
          <span className="font-bold">-{formatCurrency(totalGastos)}</span>
        </div>

        {resolvedExpensesDetail && resolvedExpensesDetail.length > 0 && (
          <div className="pl-2 pt-0.5 space-y-0.5 text-[10px] text-gray-700">
            {resolvedExpensesDetail.map((exp, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="truncate pr-1">• {exp.description}:</span>
                <span>-{formatCurrency(exp.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t-2 border-black pt-1.5 mt-1.5 flex justify-between text-xs font-bold">
          <span>UTILIDAD FINAL:</span>
          <span className="text-sm">{formatCurrency(utilidadFinal)}</span>
        </div>
      </div>

      {/* 3. DISTRIBUCIÓN DE PROPINAS POR PERSONAL */}
      {tipBreakdown && tipBreakdown.length > 0 && (
        <>
          <div className="border-b border-dashed my-2"></div>
          <div className="mb-3">
            <p className="font-bold uppercase text-center text-xs mb-1.5">
              DISTRIBUCIÓN DE PROPINAS
            </p>
            <table className="w-full text-[10px] mb-1">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="pb-1">COLABORADOR</th>
                  <th className="pb-1 text-center">HORAS</th>
                  <th className="pb-1 text-right">MONTO</th>
                </tr>
              </thead>
              <tbody>
                {tipBreakdown.map((item, idx) => (
                  <tr key={idx} className="border-b border-dotted border-gray-300">
                    <td className="py-0.5 font-bold truncate max-w-[90px]">
                      {item.employee_name}
                    </td>
                    <td className="py-0.5 text-center">
                      {Number(item.hours_worked || 0).toFixed(2)}h
                    </td>
                    <td className="py-0.5 text-right font-bold">
                      {formatCurrency(item.tip_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 4. LISTADO CONSOLIDADO DE TRANSACCIONES */}
      {orders && orders.length > 0 && (
        <>
          <div className="border-b border-dashed my-2"></div>
          <div className="mb-3">
            <p className="font-bold uppercase text-center text-xs mb-1.5">
              DETALLE DE TRANSACCIONES ({orders.length})
            </p>
            <table className="w-full text-[10px] mb-1">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="pb-1">FOLIO</th>
                  <th className="pb-1">SERVICIO</th>
                  <th className="pb-1">MÉTODO</th>
                  <th className="pb-1 text-right">IMPORTE</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const tipAmt = getOrderTipAmount(order);
                  const paymentLabel = getOrderPaymentLabel(order);
                  const serviceLabel = formatServiceTicket(order.table);

                  return (
                    <tr key={order.id} className="border-b border-dotted border-gray-300">
                      <td className="py-0.5 font-bold">#{order.orderNumber}</td>
                      <td className="py-0.5 truncate max-w-[70px] uppercase">
                        {serviceLabel}
                      </td>
                      <td className="py-0.5 truncate max-w-[60px] uppercase">
                        {paymentLabel}
                      </td>
                      <td className="py-0.5 text-right font-mono">
                        <span className="font-bold">{formatCurrency(order.total)}</span>
                        {tipAmt > 0 && (
                          <span className="text-[9px] block text-gray-600">
                            (+{formatCurrency(tipAmt)} prop)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 5. PIE DE TICKET Y FIRMA */}
      <div className="border-b border-dashed my-3"></div>
      <div className="text-center pt-4 pb-2 space-y-4">
        <div className="w-48 mx-auto border-b border-black pt-6"></div>
        <p className="text-[10px] uppercase font-bold tracking-wider">
          Firma de Gerencia / Responsable
        </p>
        <div className="pt-2 text-[9px] text-gray-500 uppercase tracking-widest">
          <p>KittnOS • Control Operativo</p>
          <p>trykittn.com</p>
        </div>
      </div>

      <style>{`
        @media print {
          .daily-summary-ticket-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 8px !important;
            margin: 0 auto !important;
            color: #000000 !important;
          }
          .daily-summary-ticket-container,
          .daily-summary-ticket-container * {
            color: #000000 !important;
            border-color: #000000 !important;
            background-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .daily-summary-ticket-container table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .daily-summary-ticket-container tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .daily-summary-ticket-container td,
          .daily-summary-ticket-container th {
            vertical-align: top !important;
          }
          .daily-summary-ticket-container hr,
          .daily-summary-ticket-container .border-dashed {
            border-style: dashed !important;
            border-color: #000000 !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

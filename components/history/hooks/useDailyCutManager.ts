"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentMethod } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { usePendingCut } from "@/hooks/usePendingCut";
import { getServiceType } from "@/lib/utils/serviceType";
import type {
  DailyCutSummaryTotals,
  ExpenseDetailItem,
  Order,
  TipBreakdownItem,
} from "../types";

export interface UseDailyCutManagerProps {
  orders: Order[];
  onCutFinalized?: () => Promise<void> | void;
}

export function useDailyCutManager({
  orders,
  onCutFinalized,
}: UseDailyCutManagerProps) {
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState(false);

  // Manual inputs for cash/card and tips reconciliation
  const [manualCash, setManualCash] = useState<string>("");
  const [manualCard, setManualCard] = useState<string>("");
  const [manualTipsEfectivo, setManualTipsEfectivo] = useState<string>("");
  const [manualTipsTarjeta, setManualTipsTarjeta] = useState<string>("");
  const [terminalCommissionRate, setTerminalCommissionRate] = useState<number>(0);

  // Tips breakdown calculation state
  const [tipBreakdown, setTipBreakdown] = useState<TipBreakdownItem[]>([]);
  const [tipTotalHours, setTipTotalHours] = useState<number>(0);
  const [isCalculatingTips, setIsCalculatingTips] = useState(false);

  // Feedback notifications
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySuccess, setHistorySuccess] = useState<string | null>(null);

  // Pending cut (from yesterday)
  const [pendingCutArmed, setPendingCutArmed] = useState(false);
  const [isGeneratingPendingCut, setIsGeneratingPendingCut] = useState(false);

  const {
    loading: pendingCutLoading,
    hasPendingCut,
    pendingDate,
    pendingOrders,
    refresh: refreshPendingCut,
  } = usePendingCut();

  const todayDateStr = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    [],
  );

  const todayOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(order.createdAt));
      return (
        orderDate === todayDateStr &&
        (order.status === "PAID" ||
          order.status === "DELIVERED" ||
          order.status === "UNCOLLECTED")
      );
    });
  }, [orders, todayDateStr]);

  const openOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(order.createdAt));
      return (
        orderDate === todayDateStr &&
        !(
          order.status === "PAID" ||
          order.status === "CANCELLED" ||
          order.status === "UNCOLLECTED"
        )
      );
    });
  }, [orders, todayDateStr]);

  const todayTotals = useMemo<DailyCutSummaryTotals>(() => {
    let ventaNeta = 0;
    let ivaAcumulado = 0;
    let propinasEfectivo = 0;
    let propinasTarjeta = 0;
    let cajaEfectivo = 0;
    let cajaTarjeta = 0;

    const processedPaymentIds = new Set<string>();

    // 1. Dinero efectivamente cobrado hoy (base efectivo)
    orders.forEach((order) => {
      const orderDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(order.createdAt));

      if (order.payments && order.payments.length > 0) {
        order.payments.forEach((payment) => {
          if (payment.id && processedPaymentIds.has(payment.id)) return;
          if (payment.id) processedPaymentIds.add(payment.id);

          const paymentDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Mexico_City",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(payment.createdAt));

          if (paymentDate === todayDateStr) {
            const amount = Number(payment.amount || 0);
            const tipAmount = Number(payment.tipAmount || 0);
            const paymentMethod = payment.method;
            const totalPago = amount + tipAmount;

            const subtotalFiscal = amount / 1.16;
            const ivaFiscal = amount - subtotalFiscal;

            ventaNeta += subtotalFiscal;
            ivaAcumulado += ivaFiscal;

            if (paymentMethod === PaymentMethod.CASH) {
              propinasEfectivo += tipAmount;
              cajaEfectivo += totalPago;
            } else if (
              paymentMethod === PaymentMethod.CARD ||
              paymentMethod === PaymentMethod.TRANSFER
            ) {
              propinasTarjeta += tipAmount;
              cajaTarjeta += totalPago;
            } else {
              cajaEfectivo += totalPago;
            }
          }
        });
      } else if (
        (order.status === "PAID" || order.status === "DELIVERED") &&
        orderDate === todayDateStr
      ) {
        // Fallback para órdenes legacy/mocks sin desglose de pagos explícito
        const amount = Number(order.total || 0);
        const subtotalFiscal = amount / 1.16;
        const ivaFiscal = amount - subtotalFiscal;

        ventaNeta += subtotalFiscal;
        ivaAcumulado += ivaFiscal;
        cajaEfectivo += amount;
      }
    });

    // 2. Créditos otorgados hoy (saldo deudor pendiente de órdenes creadas hoy a crédito)
    let creditoOtorgadoHoy = 0;
    todayOrders.forEach((order) => {
      if (order.status === "UNCOLLECTED") {
        const totalPaid = (order.payments || []).reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0,
        );
        const remainingDebt = Math.max(0, Number(order.total || 0) - totalPaid);
        creditoOtorgadoHoy += remainingDebt;
      }
    });

    const comisionTarjeta = (cajaTarjeta * terminalCommissionRate) / 100;
    const cajaTarjetaNeta = Math.max(0, cajaTarjeta - comisionTarjeta);
    const utilidadReal = ventaNeta + propinasEfectivo + propinasTarjeta;
    const utilidadFinal = utilidadReal - todayExpenses - comisionTarjeta;

    const ordersAtTable = todayOrders.filter(
      (o) => getServiceType(o.table) === "comedor",
    ).length;
    const ordersDelivery = todayOrders.filter(
      (o) => getServiceType(o.table) === "domicilio",
    ).length;
    const averageTicket =
      todayOrders.length > 0
        ? (ventaNeta + ivaAcumulado) / todayOrders.length
        : 0;

    return {
      ventaNeta,
      ivaAcumulado,
      propinasEfectivo,
      propinasTarjeta,
      cajaEfectivo,
      cajaTarjeta,
      comisionTarjeta,
      cajaTarjetaNeta,
      utilidadReal,
      utilidadFinal,
      ordersAtTable,
      ordersDelivery,
      averageTicket,
      creditoOtorgadoHoy,
    };
  }, [orders, todayOrders, todayExpenses, terminalCommissionRate, todayDateStr]);

  const fetchTodayExpenses = useCallback(async () => {
    try {
      const tenantRes = await fetch("/api/tenant");
      if (!tenantRes.ok) return;
      const { tenant } = await tenantRes.json();
      if (!tenant) return;

      if (tenant.terminal_commission_rate != null) {
        setTerminalCommissionRate(Number(tenant.terminal_commission_rate) || 0);
      }

      const supabase = createClient();
      const mxDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const { data } = await supabase
        .from("expenses")
        .select("amount, expense_categories(tipo_gasto)")
        .eq("date", mxDateStr)
        .eq("tenant_id", tenant.id);

      const typedData =
        (data as unknown as {
          amount: number;
          expense_categories: { tipo_gasto: string } | null;
        }[]) || [];

      const total = typedData.reduce((sum, e) => {
        const tipo = e.expense_categories?.tipo_gasto;
        if (!tipo || tipo === "variable") {
          return sum + Number(e.amount);
        }
        return sum;
      }, 0);

      setTodayExpenses(total);
    } catch (err) {
      console.error("Error fetching today expenses:", err);
    }
  }, []);

  useEffect(() => {
    void fetchTodayExpenses();
  }, [fetchTodayExpenses]);

  // Recalculate tips with debounce when modal is open and inputs change
  useEffect(() => {
    if (!showFinalizeModal) return;

    const calculateTips = async () => {
      setIsCalculatingTips(true);
      try {
        const res = await fetch("/api/tips/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            total_cash_tips: manualTipsEfectivo,
            total_card_tips: manualTipsTarjeta,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setTipBreakdown(data.breakdown || []);
          setTipTotalHours(data.total_hours || 0);
        }
      } catch (err) {
        console.error("Error calculating tips:", err);
      } finally {
        setIsCalculatingTips(false);
      }
    };

    const timer = setTimeout(calculateTips, 500);
    return () => clearTimeout(timer);
  }, [showFinalizeModal, manualTipsEfectivo, manualTipsTarjeta]);

  const openFinalizeModal = useCallback(() => {
    if (openOrders.length > 0) {
      setHistoryError(
        `${openOrders.length} orden${openOrders.length !== 1 ? "es" : ""} pendiente${openOrders.length !== 1 ? "s" : ""} de pago — cóbralas antes de cerrar.`,
      );
      return;
    }
    setManualCash(todayTotals.cajaEfectivo.toString());
    setManualCard(todayTotals.cajaTarjeta.toString());
    setManualTipsEfectivo(todayTotals.propinasEfectivo.toString());
    setManualTipsTarjeta(todayTotals.propinasTarjeta.toString());
    setShowFinalizeModal(true);
  }, [openOrders, todayTotals]);

  const handleFinalizarDia = useCallback(async () => {
    if (openOrders.length > 0) {
      setHistoryError(
        `No se puede cerrar: Hay ${openOrders.length} orden${
          openOrders.length !== 1 ? "es" : ""
        } pendiente${
          openOrders.length !== 1 ? "s" : ""
        } de pago. Cóbralas o cancélalas antes de continuar.`,
      );
      setShowFinalizeModal(false);
      return;
    }

    try {
      setIsFinalizing(true);
      const tenantRes = await fetch("/api/tenant");
      if (!tenantRes.ok) throw new Error("No se pudo obtener el tenant");
      const { tenant } = await tenantRes.json();
      if (!tenant) throw new Error("No se pudo obtener el tenant");

      const supabase = createClient();
      const mxDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const { data: expensesData } = await supabase
        .from("expenses")
        .select(
          "description, amount, has_invoice, expense_categories(name, tipo_gasto)",
        )
        .eq("date", mxDateStr)
        .eq("tenant_id", tenant.id);

      const typedExpenses =
        (expensesData as unknown as {
          description: string;
          amount: number;
          has_invoice?: boolean;
          expense_categories: { name: string; tipo_gasto: string } | null;
        }[]) || [];

      const expensesDetail: ExpenseDetailItem[] = typedExpenses
        .filter((e) => {
          const tipo = e.expense_categories?.tipo_gasto;
          return !tipo || tipo === "variable";
        })
        .map((e) => ({
          description: e.description,
          amount: Number(e.amount),
          category: e.expense_categories?.name ?? undefined,
          has_invoice: e.has_invoice ?? false,
        }));

      const cashFinal =
        manualCash !== "" ? Number(manualCash) : todayTotals.cajaEfectivo;
      const cardFinal =
        manualCard !== "" ? Number(manualCard) : todayTotals.cajaTarjeta;
      const tipsEfectivoFinal =
        manualTipsEfectivo !== ""
          ? Number(manualTipsEfectivo)
          : todayTotals.propinasEfectivo;
      const tipsTarjetaFinal =
        manualTipsTarjeta !== ""
          ? Number(manualTipsTarjeta)
          : todayTotals.propinasTarjeta;
      const comisionTarjetaFinal =
        (cardFinal * terminalCommissionRate) / 100;

      let cutNotes: string | null = null;
      if (todayTotals.creditoOtorgadoHoy > 0) {
        cutNotes = `[Crédito otorgado hoy: $${todayTotals.creditoOtorgadoHoy.toFixed(2)}]`;
      }

      const response = await fetch("/api/daily-cuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cut_date: mxDateStr,
          venta_neta: todayTotals.ventaNeta,
          iva_acumulado: todayTotals.ivaAcumulado,
          propinas_efectivo: tipsEfectivoFinal,
          propinas_tarjeta: tipsTarjetaFinal,
          caja_efectivo: cashFinal,
          caja_tarjeta: cardFinal,
          comision_tarjeta: comisionTarjetaFinal,
          utilidad_real:
            todayTotals.ventaNeta + tipsEfectivoFinal + tipsTarjetaFinal,
          total_gastos: todayExpenses,
          utilidad_final:
            todayTotals.ventaNeta +
            tipsEfectivoFinal +
            tipsTarjetaFinal -
            todayExpenses -
            comisionTarjetaFinal,
          total_orders: todayOrders.length,
          notes: cutNotes,
          expenses_detail: expensesDetail,
        }),
      });

      if (!response.ok) throw new Error("Error al guardar el corte");

      const { error: tipsError } = await supabase.from("daily_tips").insert({
        tenant_id: tenant.id,
        cut_date: mxDateStr,
        total_card_tips: tipsTarjetaFinal,
        total_cash_tips: tipsEfectivoFinal,
        total_tips: tipsTarjetaFinal + tipsEfectivoFinal,
        total_hours: tipTotalHours,
        breakdown: tipBreakdown as unknown as null,
      });

      if (tipsError) {
        console.error("Error saving daily tips:", tipsError);
      }

      setFinalizeSuccess(true);
      setShowFinalizeModal(false);
      setHistorySuccess(
        "¡Corte de día finalizado con éxito! Los folios de órdenes se han reiniciado.",
      );
      setTimeout(() => setHistorySuccess(null), 6000);
      if (onCutFinalized) {
        await onCutFinalized();
      }
    } catch (err) {
      console.error("Error finalizing day:", err);
      setHistoryError("Error al finalizar el día. Por favor intente de nuevo.");
    } finally {
      setIsFinalizing(false);
    }
  }, [
    openOrders,
    manualCash,
    manualCard,
    manualTipsEfectivo,
    manualTipsTarjeta,
    todayTotals,
    todayExpenses,
    todayOrders.length,
    tipTotalHours,
    tipBreakdown,
    onCutFinalized,
  ]);

  const handleGeneratePendingCut = useCallback(async () => {
    if (!pendingDate) return;
    if (!pendingCutArmed) {
      setPendingCutArmed(true);
      setTimeout(() => setPendingCutArmed(false), 4000);
      return;
    }
    setPendingCutArmed(false);

    try {
      setIsGeneratingPendingCut(true);
      const response = await fetch("/api/cortes/extemporaneo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutDate: pendingDate }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setHistoryError("Ese corte ya existe. Se actualizará la vista.");
          await refreshPendingCut();
          return;
        }
        throw new Error(data?.error || "Error al generar el corte pendiente");
      }

      setHistorySuccess(
        `Corte extemporáneo generado correctamente para ${pendingDate}.`,
      );
      setTimeout(() => setHistorySuccess(null), 5000);
      await refreshPendingCut();
      if (onCutFinalized) {
        await onCutFinalized();
      }
    } catch (err) {
      console.error("Error generating pending cut:", err);
      setHistoryError("No fue posible generar el corte pendiente.");
    } finally {
      setIsGeneratingPendingCut(false);
    }
  }, [pendingDate, pendingCutArmed, refreshPendingCut, onCutFinalized]);

  return {
    todayTotals,
    todayOrders,
    openOrders,
    todayExpenses,
    showFinalizeModal,
    setShowFinalizeModal,
    finalizeSuccess,
    setFinalizeSuccess,
    isFinalizing,
    manualCash,
    setManualCash,
    manualCard,
    setManualCard,
    manualTipsEfectivo,
    setManualTipsEfectivo,
    manualTipsTarjeta,
    setManualTipsTarjeta,
    tipBreakdown,
    tipTotalHours,
    isCalculatingTips,
    historyError,
    setHistoryError,
    historySuccess,
    setHistorySuccess,
    pendingCutArmed,
    isGeneratingPendingCut,
    pendingCutLoading,
    hasPendingCut,
    pendingDate,
    pendingOrders,
    refreshPendingCut,
    openFinalizeModal,
    handleFinalizarDia,
    handleGeneratePendingCut,
    terminalCommissionRate,
    refetchExpenses: fetchTodayExpenses,
  };
}

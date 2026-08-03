"use client";

import { OrderWithDetails, PaymentMethod } from "@/types";
import { format, isSameMonth, parseISO, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

interface TipBreakdownItem {
  employee_name: string;
  hours_worked: number;
  tip_amount: number;
}

interface DBOrderItem {
  order_id: string;
  menu_item_id: string;
  unit_price: number;
  quantity: number;
  menu_items?: {
    image_url?: string | null;
    is_available?: boolean | null;
    name?: string;
    price?: number;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

interface DBPayment {
  order_id: string;
  tip_amount?: number | null;
  [key: string]: unknown;
}

interface DBOrder {
  order_number: number;
  customer_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  order_items?: DBOrderItem[] | null;
  payments?: DBPayment[] | null;
  customers?: unknown;
  customer?: unknown;
  [key: string]: unknown;
}

interface ExpenseDataRow {
  description: string;
  amount: number;
  has_invoice: boolean;
  expense_categories: {
    name: string;
    tipo_gasto: string;
  } | null;
}
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/PageHeader";
import { FacturacionModal } from "@/components/pos/FacturacionModal";
import {
  getOrderPaymentLabel,
  getOrderPaymentMethods,
  getOrderTipAmount,
} from "@/components/pos/paymentUtils";
import {
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";
import { usePendingCut } from "@/hooks/usePendingCut";
import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  Home,
  PieChart as PieChartIcon,
  Receipt,
  Search,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
  X,
} from "lucide-react";

const COLORS = [
  "#FFB7CE",
  "#34D399",
  "#60A5FA",
  "#FBBF24",
  "#C084FC",
  "#F472B6",
  "#38BDF8",
];

type Order = OrderWithDetails;

type ExpenseDetailItem = {
  description: string;
  amount: number;
  category?: string;
  has_invoice?: boolean;
};

type DailyCut = {
  id: string;
  cut_date: string;
  venta_neta: number;
  iva_acumulado: number;
  propinas_efectivo: number;
  propinas_tarjeta: number;
  caja_efectivo: number;
  caja_tarjeta: number;
  utilidad_real: number;
  total_gastos: number;
  utilidad_final: number;
  total_orders: number;
  notes: string | null;
  expenses_detail: ExpenseDetailItem[] | null;
  created_at: string;
};

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD
  const [tableFilter, setTableFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");

  // Table Controls State - Orders Table
  type OrderSortField = "orderNumber" | "createdAt" | "table" | "total";
  const [ordersSortField, setOrdersSortField] =
    useState<OrderSortField>("createdAt");
  const [ordersSortDir, setOrdersSortDir] = useState<"asc" | "desc">("desc");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);

  // Table Controls State - Cuts Table
  type CutSortField =
    "cut_date" | "total_orders" | "venta_neta" | "utilidad_final";
  const [cutsSortField, setCutsSortField] = useState<CutSortField>("cut_date");
  const [cutsSortDir, setCutsSortDir] = useState<"asc" | "desc">("desc");
  const [cutsPage, setCutsPage] = useState(1);
  const [cutsPageSize, setCutsPageSize] = useState(10);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);

  // Corte Diario state
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState(false);
  const [showCutsArchive, setShowCutsArchive] = useState(false);
  const [dailyCuts, setDailyCuts] = useState<DailyCut[]>([]);
  const [isLoadingCuts, setIsLoadingCuts] = useState(false);
  const [manualCash, setManualCash] = useState<string>("");
  const [manualCard, setManualCard] = useState<string>("");
  const [manualTipsEfectivo, setManualTipsEfectivo] = useState<string>("");
  const [manualTipsTarjeta, setManualTipsTarjeta] = useState<string>("");
  const [selectedCutDetail, setSelectedCutDetail] = useState<DailyCut | null>(
    null,
  );
  const [isGeneratingPendingCut, setIsGeneratingPendingCut] = useState(false);

  // Inline feedback states (replacing alert/confirm)
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySuccess, setHistorySuccess] = useState<string | null>(null);
  const [pendingCutArmed, setPendingCutArmed] = useState(false);

  // Propinas Distribution state
  const [tipBreakdown, setTipBreakdown] = useState<TipBreakdownItem[]>([]);
  const [tipTotalHours, setTipTotalHours] = useState<number>(0);
  const [isCalculatingTips, setIsCalculatingTips] = useState(false);

  const {
    loading: pendingCutLoading,
    hasPendingCut,
    pendingDate,
    pendingOrders,
    refresh: refreshPendingCut,
  } = usePendingCut();

  const checkRole = async () => {
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
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/orders");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al cargar órdenes");

      const mappedOrders = (data.orders || []).map((dbOrder: DBOrder) => ({
        ...dbOrder,
        orderNumber: dbOrder.order_number,
        customerId: dbOrder.customer_id,
        createdAt: dbOrder.created_at
          ? dbOrder.created_at.includes("Z") || dbOrder.created_at.includes("+")
            ? dbOrder.created_at
            : `${dbOrder.created_at.replace(" ", "T")}Z`
          : null,
        updatedAt: dbOrder.updated_at
          ? dbOrder.updated_at.includes("Z") || dbOrder.updated_at.includes("+")
            ? dbOrder.updated_at
            : `${dbOrder.updated_at.replace(" ", "T")}Z`
          : null,
        orderItems: Array.isArray(dbOrder.order_items)
          ? dbOrder.order_items.map((item: DBOrderItem) => ({
              ...item,
              orderId: item.order_id,
              menuItemId: item.menu_item_id,
              unitPrice: item.unit_price,
              menuItem: item.menu_items
                ? {
                    ...item.menu_items,
                    imageUrl: item.menu_items?.image_url,
                    isAvailable: item.menu_items?.is_available,
                  }
                : { name: "Producto", price: item.unit_price || 0 },
            }))
          : [],
        payments: Array.isArray(dbOrder.payments)
          ? dbOrder.payments.map((p: DBPayment) => ({
              ...p,
              orderId: p.order_id,
              tipAmount: p.tip_amount,
            }))
          : [],
        customer: dbOrder.customers || dbOrder.customer || undefined,
      })) as Order[];

      setOrders(mappedOrders);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkRole();
    fetchOrders();
    fetchTodayExpenses();
  }, []);

  const fetchTodayExpenses = async () => {
    try {
      const tenantRes = await fetch("/api/tenant");
      if (!tenantRes.ok) return;
      const { tenant } = await tenantRes.json();
      if (!tenant) return;

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
  };

  const fetchDailyCuts = async () => {
    try {
      setIsLoadingCuts(true);
      const response = await fetch("/api/daily-cuts");
      const data = await response.json();
      setDailyCuts(data.cuts || []);
    } catch (err) {
      console.error("Error fetching daily cuts:", err);
    } finally {
      setIsLoadingCuts(false);
    }
  };

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

  const handleFinalizarDia = async () => {
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

      const expensesDetail: ExpenseDetailItem[] = (
        (expensesData as unknown as ExpenseDataRow[]) || []
      )
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
          utilidad_real:
            todayTotals.ventaNeta + tipsEfectivoFinal + tipsTarjetaFinal,
          total_gastos: todayExpenses,
          utilidad_final:
            todayTotals.ventaNeta +
            tipsEfectivoFinal +
            tipsTarjetaFinal -
            todayExpenses,
          total_orders: todayOrders.length,
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
        breakdown: tipBreakdown,
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
    } catch (err) {
      console.error("Error finalizing day:", err);
      setHistoryError("Error al finalizar el día. Por favor intente de nuevo.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleGeneratePendingCut = async () => {
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
      await Promise.all([fetchOrders(), fetchDailyCuts(), refreshPendingCut()]);
    } catch (err) {
      console.error("Error generating pending cut:", err);
      setHistoryError("No fue posible generar el corte pendiente.");
    } finally {
      setIsGeneratingPendingCut(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (
        searchQuery &&
        !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (dateFilter) {
        const orderDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Mexico_City",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(order.createdAt));
        if (orderDate !== dateFilter) return false;
      }
      if (tableFilter && order.table !== tableFilter) return false;
      if (paymentMethodFilter) {
        const paymentMethods = getOrderPaymentMethods(order);
        if (!paymentMethods.includes(paymentMethodFilter as PaymentMethod))
          return false;
      }
      return true;
    });
  }, [orders, searchQuery, dateFilter, tableFilter, paymentMethodFilter]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let comp = 0;
      if (ordersSortField === "orderNumber")
        comp = a.orderNumber.localeCompare(b.orderNumber);
      else if (ordersSortField === "createdAt")
        comp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (ordersSortField === "table")
        comp = (a.table || "").localeCompare(b.table || "");
      else if (ordersSortField === "total") comp = a.total - b.total;
      return ordersSortDir === "asc" ? comp : -comp;
    });
  }, [filteredOrders, ordersSortField, ordersSortDir]);

  useEffect(() => {
    setOrdersPage(1);
  }, [
    searchQuery,
    dateFilter,
    tableFilter,
    paymentMethodFilter,
    ordersSortField,
    ordersSortDir,
    ordersPageSize,
  ]);

  const ordersTotalPages = Math.ceil(sortedOrders.length / ordersPageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPageSize;
    return sortedOrders.slice(start, start + ordersPageSize);
  }, [sortedOrders, ordersPage, ordersPageSize]);

  const sortedDailyCuts = useMemo(() => {
    return [...dailyCuts].sort((a, b) => {
      let comp = 0;
      if (cutsSortField === "cut_date")
        comp = a.cut_date.localeCompare(b.cut_date);
      else if (cutsSortField === "total_orders")
        comp = a.total_orders - b.total_orders;
      else if (cutsSortField === "venta_neta")
        comp = a.venta_neta - b.venta_neta;
      else if (cutsSortField === "utilidad_final")
        comp = a.utilidad_final - b.utilidad_final;
      return cutsSortDir === "asc" ? comp : -comp;
    });
  }, [dailyCuts, cutsSortField, cutsSortDir]);

  useEffect(() => {
    setCutsPage(1);
  }, [cutsSortField, cutsSortDir, cutsPageSize]);

  const cutsTotalPages = Math.ceil(sortedDailyCuts.length / cutsPageSize) || 1;
  const paginatedDailyCuts = useMemo(() => {
    const start = (cutsPage - 1) * cutsPageSize;
    return sortedDailyCuts.slice(start, start + cutsPageSize);
  }, [sortedDailyCuts, cutsPage, cutsPageSize]);

  const toggleRow = (orderId: string) => {
    setExpandedRow((prev) => (prev === orderId ? null : orderId));
  };

  const availableTables = useMemo(() => {
    const tables = new Set(
      orders.map((o) => o.table).filter(Boolean) as string[],
    );
    return Array.from(tables).sort();
  }, [orders]);

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

  const todayTotals = useMemo(() => {
    let ventaNeta = 0;
    let ivaAcumulado = 0;
    let propinasEfectivo = 0;
    let propinasTarjeta = 0;
    let cajaEfectivo = 0;
    let cajaTarjeta = 0;

    todayOrders.forEach((order) => {
      const subtotalFiscal = order.total / 1.16;
      const ivaFiscal = order.total - subtotalFiscal;

      ventaNeta += subtotalFiscal;
      ivaAcumulado += ivaFiscal;

      if (order.payments && order.payments.length > 0) {
        order.payments.forEach((payment) => {
          const tipAmount = payment.tipAmount || 0;
          const paymentMethod = payment.method;
          const totalPago = Number(payment.amount || 0) + Number(tipAmount);

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
        });
      }
    });

    const utilidadReal = ventaNeta + propinasEfectivo + propinasTarjeta;
    const utilidadFinal = utilidadReal - todayExpenses;

    const ordersAtTable = todayOrders.filter(
      (o) => o.table && o.table !== "Domicilio",
    ).length;
    const ordersDelivery = todayOrders.filter(
      (o) => o.table === "Domicilio",
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
      utilidadReal,
      utilidadFinal,
      ordersAtTable,
      ordersDelivery,
      averageTicket,
    };
  }, [todayOrders, todayExpenses]);

  const chartsData = useMemo(() => {
    const now = new Date();
    const dailyMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    let currentMonthTotal = 0;
    let previousMonthTotal = 0;

    orders.forEach((order) => {
      if (order.status !== "PAID" && order.status !== "DELIVERED") return;

      const date = new Date(order.createdAt);
      const subtotalFiscal = order.total / 1.16;

      if (isSameMonth(date, now)) {
        currentMonthTotal += subtotalFiscal;
        const dayKey = format(date, "yyyy-MM-dd");
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + subtotalFiscal);

        order.orderItems?.forEach((item) => {
          const cat = item.menuItem?.category || "Otros";
          const itemImporteFiscal = (item.quantity * item.unitPrice) / 1.16;
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + itemImporteFiscal);
        });
      } else if (isSameMonth(date, subMonths(now, 1))) {
        previousMonthTotal += subtotalFiscal;
      }
    });

    const dailySales = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({
        date: format(parseISO(date), "dd MMM", { locale: es }),
        total,
      }));

    const salesMix = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const growth = [
      {
        name: format(subMonths(now, 1), "MMMM", { locale: es }).toUpperCase(),
        total: previousMonthTotal,
      },
      {
        name: format(now, "MMMM", { locale: es }).toUpperCase(),
        total: currentMonthTotal,
      },
    ];

    return { dailySales, salesMix, growth };
  }, [orders]);

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

  if (isLoading) {
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
      {/* Header reutilizable */}
      <PageHeader
        title="Historial y Estadísticas"
        subtitle="Control de ventas, cortes de caja y balance financiero"
        badgeColor="bg-blue-500"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print space-y-8">
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {historyError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{historyError}</span>
            </div>
            <button
              type="button"
              onClick={() => setHistoryError(null)}
              className="text-red-400/60 hover:text-red-400 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {historySuccess && (
          <div className="rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-bold text-success flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{historySuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setHistorySuccess(null)}
              className="text-success/60 hover:text-success shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* FILTROS DE BÚSQUEDA */}
        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
          <h2 className="text-xs font-extrabold text-text-light/50 uppercase tracking-widest flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary"></span>
            Filtros de Búsqueda
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
                Buscar Folio
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. 001"
                  className="w-full rounded-xl border border-border bg-dark/40 pl-9 pr-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors placeholder:text-text-light/30"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
                Fecha
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-dark/40 pl-9 pr-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors scheme-dark"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
                Mesa
              </label>
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors"
              >
                <option value="">Todas las Mesas</option>
                {availableTables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
                Método de Pago
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors"
              >
                <option value="">Todos los Métodos</option>
                <option value={PaymentMethod.CASH}>Efectivo</option>
                <option value={PaymentMethod.CARD}>Tarjeta</option>
                <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                <option value={PaymentMethod.OTHER}>Otro</option>
              </select>
            </div>
          </div>
        </section>

        {/* CORTE DIARIO */}
        <section
          className={`rounded-2xl bg-card p-6 shadow-sm border border-border border-l-4 space-y-6 ${
            finalizeSuccess ? "border-l-success" : "border-l-blue-500"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    finalizeSuccess ? "bg-success" : "bg-blue-500"
                  }`}
                ></span>
                Corte Diario
              </h2>
              <p className="text-xs font-medium text-text-light/50 mt-0.5">
                {finalizeSuccess
                  ? "✅ Corte guardado — contadores reiniciados para el siguiente ciclo"
                  : `Hoy · ${todayOrders.length} orden${
                      todayOrders.length !== 1 ? "es" : ""
                    } completada${todayOrders.length !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCutsArchive((v) => !v);
                  if (!showCutsArchive) fetchDailyCuts();
                }}
                className="rounded-xl border border-border bg-white/5 px-3.5 py-2 text-xs font-black text-text-light hover:bg-white/10 transition-all uppercase tracking-wider flex items-center gap-1.5"
              >
                <Folder className="h-3.5 w-3.5 text-blue-400" />
                Archivo de Cortes
              </button>

              {!pendingCutLoading && hasPendingCut && (
                <button
                  type="button"
                  onClick={handleGeneratePendingCut}
                  disabled={isGeneratingPendingCut}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 transition-all ${
                    pendingCutArmed
                      ? "bg-amber-500/30 border-amber-500/50 text-amber-300 animate-[pulse_0.6s_ease-in-out_infinite]"
                      : "bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {isGeneratingPendingCut
                    ? "Generando..."
                    : pendingCutArmed
                      ? "¿Confirmar corte?"
                      : `Corte pendiente (${pendingDate} · ${pendingOrders})`}
                </button>
              )}

              {!finalizeSuccess && (
                <button
                  type="button"
                  onClick={() => {
                    if (openOrders.length > 0) {
                      setHistoryError(
                        `${openOrders.length} orden${openOrders.length !== 1 ? "es" : ""} pendiente${openOrders.length !== 1 ? "s" : ""} de pago — cóbralas antes de cerrar.`,
                      );
                      return;
                    }
                    setManualCash(todayTotals.cajaEfectivo.toString());
                    setManualCard(todayTotals.cajaTarjeta.toString());
                    setManualTipsEfectivo(
                      todayTotals.propinasEfectivo.toString(),
                    );
                    setManualTipsTarjeta(
                      todayTotals.propinasTarjeta.toString(),
                    );
                    setShowFinalizeModal(true);
                  }}
                  className="rounded-xl bg-success px-4 py-2 text-xs font-black text-white hover:brightness-110 transition-all uppercase tracking-wider shadow-lg shadow-success/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar Día
                </button>
              )}
            </div>
          </div>

          {finalizeSuccess ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-3">
                <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
                  <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                    Venta Neta Total (Sin IVA)
                  </span>
                  <span className="text-text-light/40 text-xl font-mono">
                    $0.00
                  </span>
                </div>
                <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
                  <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                    IVA Acumulado
                  </span>
                  <span className="text-text-light/40 text-xl font-mono">
                    $0.00
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
                  <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                    Propinas (Efectivo)
                  </span>
                  <span className="text-text-light/40 text-xl font-mono">
                    $0.00
                  </span>
                </div>
                <div className="bg-dark/40 p-3.5 rounded-xl border border-border">
                  <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                    Propinas (Tarjeta)
                  </span>
                  <span className="text-text-light/40 text-xl font-mono">
                    $0.00
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-dark/40 p-3.5 rounded-xl border border-emerald-500/20">
                  <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                    Caja Final (Efectivo)
                  </span>
                  <span className="text-text-light/40 text-xl font-mono">
                    $0.00
                  </span>
                </div>
                <div className="bg-dark/40 p-3.5 rounded-xl border border-blue-500/20">
                  <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                    Caja Final (Tarjeta)
                  </span>
                  <span className="text-text-light/40 text-xl font-mono">
                    $0.00
                  </span>
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
              {/* Venta y IVA */}
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

              {/* Propinas */}
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

              {/* Caja Final */}
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
                </div>
              </div>

              {/* Gastos del día */}
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

              {/* Utilidad Final */}
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
                    (Utilidad Real - Gastos)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Resumen Operativo */}
          {!finalizeSuccess && todayOrders.length > 0 && (
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
                      {todayOrders.length}{" "}
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

        {/* ARCHIVO DE CORTES */}
        {showCutsArchive && (
          <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
            <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2 border-b border-border pb-3">
              <Folder className="h-5 w-5 text-blue-400" />
              Archivo de Cortes Diarios
            </h2>

            {isLoadingCuts ? (
              <p className="text-xs text-text-light/50 font-bold italic py-4">
                Cargando archivo de cortes...
              </p>
            ) : dailyCuts.length === 0 ? (
              <p className="text-xs text-text-light/50 font-bold italic py-4">
                No hay cortes registrados aún.
              </p>
            ) : (
              <div className="overflow-x-auto space-y-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                      <TableHeaderSortCell
                        field="cut_date"
                        label="Fecha"
                        currentSortField={cutsSortField}
                        sortDirection={cutsSortDir}
                        onSort={(f) => {
                          setCutsSortField(f);
                          setCutsSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        }}
                      />
                      <TableHeaderSortCell
                        field="total_orders"
                        label="Órdenes"
                        currentSortField={cutsSortField}
                        sortDirection={cutsSortDir}
                        onSort={(f) => {
                          setCutsSortField(f);
                          setCutsSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        }}
                        className="text-right"
                      />
                      <th className="py-3 px-3 text-right">Venta Bruta</th>
                      <TableHeaderSortCell
                        field="venta_neta"
                        label="Venta Neta"
                        currentSortField={cutsSortField}
                        sortDirection={cutsSortDir}
                        onSort={(f) => {
                          setCutsSortField(f);
                          setCutsSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        }}
                        className="text-right"
                      />
                      <th className="py-3 px-3 text-right">IVA</th>
                      <th className="py-3 px-3 text-right">Gastos</th>
                      <TableHeaderSortCell
                        field="utilidad_final"
                        label="Utilidad Final"
                        currentSortField={cutsSortField}
                        sortDirection={cutsSortDir}
                        onSort={(f) => {
                          setCutsSortField(f);
                          setCutsSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        }}
                        className="text-right"
                      />
                      <th className="py-3 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedDailyCuts.map((cut) => {
                      const ventaBruta =
                        Number(cut.venta_neta) + Number(cut.iva_acumulado);
                      return (
                        <tr
                          key={cut.id}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3.5 px-3 font-bold text-text-light">
                            {new Date(
                              `${cut.cut_date}T12:00:00`,
                            ).toLocaleDateString("es-MX", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-text-light/80">
                            {cut.total_orders}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400">
                            ${ventaBruta.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-text-light/70">
                            ${Number(cut.venta_neta).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-amber-400">
                            ${Number(cut.iva_acumulado).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-red-400">
                            -${Number(cut.total_gastos).toFixed(2)}
                          </td>
                          <td
                            className={`py-3.5 px-3 text-right font-mono font-black ${
                              Number(cut.utilidad_final) >= 0
                                ? "text-blue-400"
                                : "text-red-400"
                            }`}
                          >
                            ${Number(cut.utilidad_final).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => setSelectedCutDetail(cut)}
                              className="rounded-xl border border-border bg-white/5 px-3 py-1 text-[10px] font-black text-text-light hover:bg-white/10 transition-all uppercase tracking-wider"
                            >
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <TablePagination
                  currentPage={cutsPage}
                  totalPages={cutsTotalPages}
                  totalItems={sortedDailyCuts.length}
                  pageSize={cutsPageSize}
                  onPageChange={setCutsPage}
                  onPageSizeChange={setCutsPageSize}
                />
              </div>
            )}
          </section>
        )}

        {/* GRÁFICAS FINANCIERAS */}
        <section className="space-y-4">
          <h2 className="text-xs font-extrabold text-text-light/50 uppercase tracking-widest flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            Análisis y Tendencias
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Venta Diaria */}
            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border lg:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-text-light uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                Venta Diaria ({format(new Date(), "MMMM", { locale: es })})
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartsData.dailySales}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis dataKey="date" stroke="#888888" fontSize={11} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1D1D1D",
                        borderColor: "#333333",
                        borderRadius: "12px",
                        color: "#E0E0E0",
                      }}
                      formatter={(value: number | string | undefined) => [
                        `$${Number(value).toFixed(2)}`,
                        "Venta Neta",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#FFB7CE"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#FFB7CE" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mix de Ventas */}
            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
              <h3 className="text-sm font-black text-text-light uppercase tracking-wider flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-emerald-400" />
                Mix de Ventas
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.salesMix}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartsData.salesMix.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1D1D1D",
                        borderColor: "#333333",
                        borderRadius: "12px",
                        color: "#E0E0E0",
                      }}
                      formatter={(value: number | string | undefined) => [
                        `$${Number(value).toFixed(2)}`,
                        "Importe",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", color: "#888888" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Crecimiento Mensual */}
            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border lg:col-span-3 space-y-4">
              <h3 className="text-sm font-black text-text-light uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Crecimiento Mensual
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartsData.growth}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#2A2A2A"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="#888888"
                      fontSize={11}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#888888"
                      fontSize={11}
                      width={90}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1D1D1D",
                        borderColor: "#333333",
                        borderRadius: "12px",
                        color: "#E0E0E0",
                      }}
                      formatter={(value: number | string | undefined) => [
                        `$${Number(value).toFixed(2)}`,
                        "Total Venta Neta",
                      ]}
                      cursor={{ fill: "#242424" }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#03A63C"
                      barSize={36}
                      radius={[0, 8, 8, 0]}
                    >
                      {chartsData.growth.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? "#4B5563" : "#03A63C"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* TABLA PRINCIPAL DE ÓRDENES */}
        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border overflow-hidden space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success"></span>
              Registros de Órdenes
            </h2>
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-widest">
              Mostrando {filteredOrders.length} orden
              {filteredOrders.length !== 1 ? "es" : ""}
            </span>
          </div>

          <div className="overflow-x-auto space-y-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                  <TableHeaderSortCell
                    field="orderNumber"
                    label="Folio"
                    currentSortField={ordersSortField}
                    sortDirection={ordersSortDir}
                    onSort={(f) => {
                      setOrdersSortField(f);
                      setOrdersSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    }}
                  />
                  <TableHeaderSortCell
                    field="createdAt"
                    label="Fecha"
                    currentSortField={ordersSortField}
                    sortDirection={ordersSortDir}
                    onSort={(f) => {
                      setOrdersSortField(f);
                      setOrdersSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    }}
                  />
                  <TableHeaderSortCell
                    field="table"
                    label="Mesa"
                    currentSortField={ordersSortField}
                    sortDirection={ordersSortDir}
                    onSort={(f) => {
                      setOrdersSortField(f);
                      setOrdersSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    }}
                  />
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">IVA (16%)</th>
                  <th className="py-3 px-3 text-right">Propina</th>
                  <TableHeaderSortCell
                    field="total"
                    label="TOTAL PAGO"
                    currentSortField={ordersSortField}
                    sortDirection={ordersSortDir}
                    onSort={(f) => {
                      setOrdersSortField(f);
                      setOrdersSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    }}
                    className="text-right text-primary"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedOrders.map((order) => {
                  const tipAmount = getOrderTipAmount(order);
                  const paymentMethods = getOrderPaymentMethods(order);
                  const primaryPaymentMethod = paymentMethods[0] || "N/A";

                  const subtotalFiscal = order.total / 1.16;
                  const ivaFiscal = order.total - subtotalFiscal;
                  const totalPago = order.total + tipAmount;

                  let methodLabel = getOrderPaymentLabel(order);
                  let methodBadgeClass =
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                  if (order.status === "UNCOLLECTED") {
                    methodLabel = "NO COBRADA";
                    methodBadgeClass =
                      "bg-red-500/10 text-red-400 border-red-500/20";
                  } else if (
                    primaryPaymentMethod === "CARD" ||
                    primaryPaymentMethod === "TRANSFER"
                  ) {
                    methodBadgeClass =
                      "bg-blue-500/10 text-blue-400 border-blue-500/20";
                  } else if (paymentMethods.length > 1) {
                    methodBadgeClass =
                      "bg-purple-500/10 text-purple-300 border-purple-500/20";
                  }

                  const isExpanded = expandedRow === order.id;

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className="hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => toggleRow(order.id)}
                      >
                        <td className="py-3.5 px-3 font-mono font-black text-sm text-text-light">
                          <div className="flex items-center gap-2">
                            <span className="text-text-light/40">
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </span>
                            #{order.orderNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-text-light/80 font-medium">
                          {new Date(order.createdAt).toLocaleDateString(
                            "es-MX",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "America/Mexico_City",
                            },
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black text-text-light/70 uppercase tracking-wider">
                            {order.table || "Para Llevar"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${methodBadgeClass}`}
                          >
                            {methodLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-text-light/70">
                          ${subtotalFiscal.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-amber-400/80">
                          ${ivaFiscal.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-blue-400">
                          ${tipAmount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-black text-text-light text-sm">
                          ${totalPago.toFixed(2)}
                        </td>
                      </tr>

                      {/* FILA EXPANDIDA PARA DETALLES DE PRODUCTOS */}
                      {isExpanded && (
                        <tr className="bg-dark/40">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-border pb-2">
                                <h4 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-1.5">
                                  <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                                  Detalle de la Orden #{order.orderNumber}
                                </h4>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBillingOrder(order);
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-[10px] font-black text-blue-400 hover:bg-blue-500/20 transition-all uppercase tracking-wider"
                                >
                                  <Receipt className="h-3.5 w-3.5" /> Facturar
                                  Orden
                                </button>
                              </div>

                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[10px] font-bold text-text-light/40 border-b border-border">
                                    <th className="pb-1 text-left">Producto</th>
                                    <th className="pb-1 text-center">Cant.</th>
                                    <th className="pb-1 text-right">P. Unit</th>
                                    <th className="pb-1 text-right">
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {order.orderItems?.map((item) => {
                                    const unitPrice = Number(
                                      item.unitPrice || 0,
                                    );
                                    const subtotal = item.quantity * unitPrice;
                                    return (
                                      <tr key={item.id}>
                                        <td className="py-1.5 font-bold text-text-light">
                                          {item.menuItem?.name || "Producto"}
                                          {item.notes && (
                                            <span className="text-[10px] text-amber-400/80 block font-normal">
                                              Notas: {item.notes}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1.5 text-center font-mono">
                                          {item.quantity}
                                        </td>
                                        <td className="py-1.5 text-right font-mono text-text-light/60">
                                          ${unitPrice.toFixed(2)}
                                        </td>
                                        <td className="py-1.5 text-right font-mono font-bold text-text-light">
                                          ${subtotal.toFixed(2)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {paginatedOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-text-light/40 italic"
                    >
                      No se encontraron órdenes que coincidan con los filtros
                      seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <TablePagination
              currentPage={ordersPage}
              totalPages={ordersTotalPages}
              totalItems={sortedOrders.length}
              pageSize={ordersPageSize}
              onPageChange={setOrdersPage}
              onPageSizeChange={setOrdersPageSize}
            />
          </div>
        </section>
      </main>

      {/* MODAL DETALLE DE CORTE */}
      {selectedCutDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-400" />
                  Detalle del Corte
                </h3>
                <p className="text-xs font-bold text-text-light/50 mt-0.5">
                  {new Date(
                    `${selectedCutDetail.cut_date}T12:00:00`,
                  ).toLocaleDateString("es-MX", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedCutDetail(null)}
                className="text-text-light/40 hover:text-text-light transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark/40 p-3 rounded-xl border border-border">
                <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                  Venta Neta (Sin IVA)
                </span>
                <span className="text-text-light text-lg font-mono font-bold">
                  ${Number(selectedCutDetail.venta_neta).toFixed(2)}
                </span>
              </div>
              <div className="bg-dark/40 p-3 rounded-xl border border-border">
                <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                  IVA Acumulado
                </span>
                <span className="text-amber-400 text-lg font-mono font-bold">
                  ${Number(selectedCutDetail.iva_acumulado).toFixed(2)}
                </span>
              </div>
              <div className="bg-dark/40 p-3 rounded-xl border border-border">
                <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                  Propinas (Efectivo)
                </span>
                <span className="text-emerald-400 text-lg font-mono font-bold">
                  ${Number(selectedCutDetail.propinas_efectivo).toFixed(2)}
                </span>
              </div>
              <div className="bg-dark/40 p-3 rounded-xl border border-border">
                <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                  Propinas (Tarjeta)
                </span>
                <span className="text-blue-400 text-lg font-mono font-bold">
                  ${Number(selectedCutDetail.propinas_tarjeta).toFixed(2)}
                </span>
              </div>
              <div className="bg-dark/40 p-3 rounded-xl border border-emerald-500/20">
                <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                  Caja Final (Efectivo)
                </span>
                <span className="text-emerald-400 text-lg font-mono font-black">
                  ${Number(selectedCutDetail.caja_efectivo).toFixed(2)}
                </span>
              </div>
              <div className="bg-dark/40 p-3 rounded-xl border border-blue-500/20">
                <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                  Caja Final (Tarjeta)
                </span>
                <span className="text-blue-400 text-lg font-mono font-black">
                  ${Number(selectedCutDetail.caja_tarjeta).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Desglose de Gastos */}
            <div className="bg-dark/40 rounded-xl border border-red-500/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest">
                  Gastos Registrados
                </span>
                <span className="text-red-400 font-mono font-black">
                  -${Number(selectedCutDetail.total_gastos).toFixed(2)}
                </span>
              </div>
              {selectedCutDetail.expenses_detail &&
              selectedCutDetail.expenses_detail.length > 0 ? (
                <div className="space-y-1 pt-2 border-t border-border">
                  {selectedCutDetail.expenses_detail.map((expense, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {expense.has_invoice && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">
                            FAC
                          </span>
                        )}
                        <span className="text-text-light/70 truncate">
                          {expense.description}
                        </span>
                      </div>
                      <span className="text-red-400 font-mono font-bold shrink-0 ml-2">
                        -${Number(expense.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-light/40 text-xs italic pt-1">
                  Sin registro individual de gastos en este corte.
                </p>
              )}
            </div>

            <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-500/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-300 font-black uppercase tracking-wider">
                  Utilidad Real
                </span>
                <span className="text-text-light font-black font-mono">
                  ${Number(selectedCutDetail.utilidad_real).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-500/20">
                <span className="text-blue-300 font-black uppercase tracking-wider text-xs">
                  Utilidad Final (- Gastos)
                </span>
                <span
                  className={`text-lg font-black font-mono ${
                    Number(selectedCutDetail.utilidad_final) >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  ${Number(selectedCutDetail.utilidad_final).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedCutDetail(null)}
              className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR DÍA */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-emerald-500/30 space-y-5">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Finalizar Día
              </h3>
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="text-text-light/40 hover:text-text-light transition-colors"
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

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] text-text-light/50 uppercase font-black mb-1 block">
                    Efectivo Caja
                  </label>
                  <input
                    type="number"
                    value={manualCash}
                    onChange={(e) => setManualCash(e.target.value)}
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
                    onChange={(e) => setManualCard(e.target.value)}
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
                    onChange={(e) => setManualTipsEfectivo(e.target.value)}
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
                    onChange={(e) => setManualTipsTarjeta(e.target.value)}
                    className="w-full bg-dark/40 border border-border rounded-lg px-2.5 py-1.5 text-blue-400/80 font-mono font-bold focus:border-blue-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between border-t border-border pt-2 text-text-light/60">
                <span>Órdenes completadas</span>
                <span className="text-text-light font-bold">
                  {todayOrders.length}
                </span>
              </div>
              <div className="flex justify-between text-text-light/60">
                <span>Gastos del Día</span>
                <span className="text-red-400 font-mono font-bold">
                  -${todayExpenses.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Distribución de Propinas */}
            <div className="bg-dark/40 p-4 rounded-xl border border-border space-y-2">
              <h4 className="text-xs font-black text-text-light uppercase tracking-wider flex items-center justify-between">
                <span>Distribución de Propinas</span>
                {isCalculatingTips && (
                  <span className="text-[10px] text-blue-400">
                    Calculando...
                  </span>
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

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isFinalizing}
                className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinalizarDia}
                disabled={isFinalizing}
                className="w-full bg-success text-white py-3 rounded-xl font-black hover:brightness-110 transition-all uppercase text-xs tracking-wider shadow-lg shadow-success/20 disabled:opacity-50"
              >
                {isFinalizing ? "Guardando..." : "Confirmar y Finalizar"}
              </button>
            </div>
          </div>
        </div>
      )}

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

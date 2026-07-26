"use client";

import { PageHeader } from "@/components/PageHeader";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Layers,
  Printer,
  ReceiptText,
  Sparkles,
  Store,
  TrendingDown,
  UserPlus,
  Users,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type ProductSaleItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
};

type ReportData = {
  period: string;
  summary: {
    totalSales: number;
    totalOrders: number;
    averageTicket: number;
    totalTips: number;
    averageCompletionTimeMinutes: number;
    totalExpenses: number;
    totalUncollected: number;
  };
  salesByDay: Record<string, number>;
  itemsByDay: Record<string, { name: string; quantity: number; revenue: number }[]>;
  salesBySource: Record<string, { count: number; total: number }>;
  topSellingItems: { name: string; quantity: number; revenue: number }[];
  productSales?: ProductSaleItem[];
  categories?: string[];
  customers: {
    topCustomers: { name: string; totalSpend: number; loyaltyPoints: number }[];
    newCustomersCount: number;
  };
};

type Period = "today" | "yesterday" | "7days" | "30days" | "month" | "last_month" | "custom";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  "7days": "Últimos 7 días",
  "30days": "Últimos 30 días",
  month: "Mes Actual",
  last_month: "Mes Anterior",
  custom: "Personalizado",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("7days");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Custom date range states
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // States for Product Sales Distribution Chart
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [productMetric, setProductMetric] = useState<"revenue" | "quantity">("revenue");

  const fetchData = async (p: Period, startDateStr?: string, endDateStr?: string) => {
    try {
      setIsLoading(true);
      setSelectedDay(null);
      let url = `/api/reports?period=${p}`;
      if (p === "custom") {
        if (startDateStr) url += `&startDate=${startDateStr}`;
        if (endDateStr) url += `&endDate=${endDateStr}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al cargar reportes");
      const json = await response.json();
      setData(json);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error desconocido",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== "custom") {
      fetchData(p);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate) return;
    fetchData("custom", customStartDate, customEndDate);
  };

  useEffect(() => {
    fetchData(period);
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.salesByDay).map(([date, total]) => ({
      date,
      total,
      label: new Date(`${date}T12:00:00-06:00`).toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        timeZone: "America/Mexico_City",
      }),
    }));
  }, [data]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDay || !data?.itemsByDay) return [];
    return data.itemsByDay[selectedDay] || [];
  }, [selectedDay, data]);

  const categoriesList = useMemo(() => {
    if (!data?.productSales) return ["TODAS"];
    const cats = Array.from(new Set(data.productSales.map((p) => p.category).filter(Boolean)));
    return ["TODAS", ...cats];
  }, [data]);

  const productChartData = useMemo(() => {
    if (!data?.productSales) return [];
    let list = data.productSales;
    if (selectedCategory !== "TODAS") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    return [...list]
      .sort((a, b) => (productMetric === "revenue" ? b.revenue - a.revenue : b.quantity - a.quantity))
      .slice(0, 10);
  }, [data, selectedCategory, productMetric]);

  const totalCategoryRevenue = useMemo(() => {
    return productChartData.reduce((sum, item) => sum + item.revenue, 0);
  }, [productChartData]);

  const totalCategoryQuantity = useMemo(() => {
    return productChartData.reduce((sum, item) => sum + item.quantity, 0);
  }, [productChartData]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] text-[#E0E0E0]/60 text-sm font-bold uppercase tracking-wider">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          Cargando reportes & métricas...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#121212] p-4 text-center">
        <div className="rounded-2xl bg-[#242424] p-8 shadow-sm border border-red-500/20 max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-black text-[#E0E0E0] uppercase tracking-tight mb-2">Error al Cargar Datos</h2>
          <p className="text-xs text-[#E0E0E0]/60 mb-6">{errorMessage}</p>
          <button
            onClick={() => fetchData(period)}
            className="rounded-xl bg-primary px-6 py-2.5 text-xs font-black text-white uppercase tracking-wider hover:bg-primary/90 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const netUtility = data.summary.totalSales - (data.summary.totalExpenses || 0);

  return (
    <div className="min-h-screen bg-[#121212] pb-16">
      {/* Header reutilizable */}
      <PageHeader
        title="Reportes & Analytics"
        subtitle={`Análisis financiero y métricas de desempeño (${PERIOD_LABELS[period]})`}
        badgeColor="bg-primary"
        actions={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-black uppercase tracking-wider hover:brightness-105 transition-all shadow-lg shadow-primary/20"
          >
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
        }
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">

        {/* Period Selector Card */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Filtro de Período y Fechas
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {(["today", "yesterday", "7days", "30days", "month", "last_month", "custom"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${period === p
                    ? "bg-primary text-black shadow-md shadow-primary/20 scale-[1.02]"
                    : "bg-[#181818] text-[#E0E0E0]/60 hover:bg-white/10 hover:text-white border border-white/5"
                  }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Custom Date Range Controls */}
          {period === "custom" && (
            <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#E0E0E0]/60 uppercase tracking-wider">
                  Desde:
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#181818] px-3.5 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#E0E0E0]/60 uppercase tracking-wider">
                  Hasta:
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#181818] px-3.5 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleApplyCustomDates}
                disabled={!customStartDate}
                className="rounded-xl bg-success px-5 py-2 text-xs font-black text-white uppercase tracking-wider hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
              >
                Aplicar Rango
              </button>
            </div>
          )}
        </section>

        {/* KPI Cards Grid */}
        <section>
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success"></span>
              Resumen Financiero y Operativo
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Venta Bruta */}
            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Venta Bruta
                </span>
                <div className="rounded-xl bg-success/10 p-3 text-success">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                ${data.summary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-[#E0E0E0]/40 font-medium">
                Total ingresado a caja ({data.summary.totalOrders} órdenes)
              </p>
            </div>

            {/* Gastos Generales */}
            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Gastos Operativos
                </span>
                <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-red-400 tracking-tight">
                -${(data.summary.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-[#E0E0E0]/40 font-medium">
                Insumos, sueldos y servicios
              </p>
            </div>

            {/* Utilidad Neta */}
            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Utilidad Neta
                </span>
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <p className={`mt-3 text-3xl font-black tracking-tight ${netUtility >= 0 ? "text-primary" : "text-red-400"}`}>
                ${netUtility.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-[#E0E0E0]/40 font-medium">
                Ventas brutas menos gastos
              </p>
            </div>

            {/* Ticket Promedio */}
            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Ticket Promedio
                </span>
                <div className="rounded-xl bg-secondary/10 p-3 text-secondary">
                  <ReceiptText className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                ${data.summary.averageTicket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-[#E0E0E0]/40 font-medium">
                Promedio ingresado por orden
              </p>
            </div>

            {/* Tiempo Preparación */}
            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Tiempo Promedio KDS
                </span>
                <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                {Math.round(data.summary.averageCompletionTimeMinutes)}{" "}
                <span className="text-sm font-bold text-[#E0E0E0]/50 uppercase">min</span>
              </p>
              <p className="mt-1 text-xs text-[#E0E0E0]/40 font-medium">
                Tiempo de preparación en cocina
              </p>
            </div>

            {/* Nuevos Clientes */}
            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Nuevos Clientes
                </span>
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                  <UserPlus className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                {data.customers.newCustomersCount}
              </p>
              <p className="mt-1 text-xs text-[#E0E0E0]/40 font-medium">
                Registrados en el período
              </p>
            </div>

            {/* Pérdidas por Cobro */}
            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Pérdidas de Cobro
                </span>
                <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-amber-400 tracking-tight">
                ${(data.summary.totalUncollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-[#E0E0E0]/40 font-medium">
                Órdenes no cobradas / canceladas
              </p>
            </div>

            {/* Total Propinas */}
            <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Propinas Totales
                </span>
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                ${(data.summary.totalTips || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-[#E0E0E0]/40 font-medium">
                Propinas acumuladas para staff
              </p>
            </div>
          </div>
        </section>

        {/* Section: Interactive Sales Chart (Ventas por Día) */}
        <section className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5">
          <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-secondary"></span>
              Tendencia de Ventas por Día
            </h2>
            {selectedDay && (
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider"
              >
                ✕ Cerrar filtro diario
              </button>
            )}
          </div>

          <p className="text-xs text-[#E0E0E0]/60 mb-6 font-medium">
            Haz clic en cualquiera de las barras para desplegar el desglose de productos vendidos ese día.
          </p>

          {chartData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="label"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tick={{ fill: "#9CA3AF" }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tick={{ fill: "#9CA3AF" }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#181818",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "#FFF",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                    }}
                    formatter={(value: number | undefined) => [
                      `$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                      "Ventas Totales",
                    ]}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar
                    dataKey="total"
                    radius={[6, 6, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(barData) => {
                      const date = (barData.payload as { date: string })?.date;
                      if (date) setSelectedDay((prev) => (prev === date ? null : date));
                    }}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.date}
                        fill={selectedDay === entry.date ? "#F59E0B" : "#3B82F6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
              No hay registros de ventas en el período seleccionado.
            </p>
          )}

          {/* Day Drill-Down Panel */}
          {selectedDay && (
            <div className="mt-6 rounded-2xl bg-[#181818] border border-amber-500/30 p-6">
              <h3 className="text-sm font-black text-amber-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Top Productos —{" "}
                {new Date(`${selectedDay}T12:00:00-06:00`).toLocaleDateString("es-MX", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "America/Mexico_City",
                })}
              </h3>
              {selectedDayItems.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-black text-amber-400">
                          #{i + 1}
                        </span>
                        <span className="text-sm font-bold text-[#E0E0E0]">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-[#E0E0E0]">
                          {item.quantity} vendidos
                        </span>
                        <span className="ml-3 text-xs font-semibold text-emerald-400">
                          ${item.revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#E0E0E0]/50 font-medium">
                  No hay detalle de productos registrado para esta fecha.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Product Sales Distribution Chart Section */}
        <section className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                Distribución de Ventas por Producto
              </h2>
              <p className="text-xs text-[#E0E0E0]/60 mt-1 font-medium">
                Analiza el volumen y concentración de ventas individuales por producto y categoría.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2 bg-[#181818] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <Layers className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-[#E0E0E0]/60 font-bold uppercase tracking-wider">Cat:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-[#E0E0E0] text-xs font-bold uppercase tracking-wider outline-none cursor-pointer"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#242424] text-[#E0E0E0]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Metric Toggle ($ vs Units) */}
              <div className="flex items-center bg-[#181818] p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setProductMetric("revenue")}
                  className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${productMetric === "revenue"
                      ? "bg-success text-white shadow-md"
                      : "text-[#E0E0E0]/60 hover:text-white"
                    }`}
                >
                  $ Ingresos
                </button>
                <button
                  onClick={() => setProductMetric("quantity")}
                  className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${productMetric === "quantity"
                      ? "bg-purple-600 text-white shadow-md"
                      : "text-[#E0E0E0]/60 hover:text-white"
                    }`}
                >
                  # Unidades
                </button>
              </div>
            </div>
          </div>

          {/* Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#181818] p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block">
                Total Recaudado ({selectedCategory})
              </span>
              <span className="text-lg font-black text-emerald-400 mt-1 block">
                ${totalCategoryRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-[#181818] p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block">
                Unidades Vendidas
              </span>
              <span className="text-lg font-black text-purple-400 mt-1 block">
                {totalCategoryQuantity.toLocaleString()} u.
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-[#181818] p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block">
                Producto Estrella
              </span>
              <span className="text-sm font-black text-[#E0E0E0] truncate mt-1 block uppercase">
                {productChartData[0]?.name || "N/A"}
              </span>
            </div>
          </div>

          {/* Horizontal Bar Chart Container */}
          {productChartData.length > 0 ? (
            <div className="w-full overflow-hidden">
              <div style={{ height: Math.max(260, productChartData.length * 48) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={productChartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tick={{ fill: "#9CA3AF" }}
                      tickFormatter={(val) =>
                        productMetric === "revenue"
                          ? `$${val.toLocaleString()}`
                          : `${val}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#9CA3AF"
                      fontSize={12}
                      width={140}
                      tick={{ fill: "#E0E0E0" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#181818",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#FFF",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                      }}
                      formatter={(value: number | undefined) => [
                        productMetric === "revenue"
                          ? `$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : `${value} unidades vendidas`,
                        productMetric === "revenue" ? "Ingresos Generados" : "Volumen Vendido",
                      ]}
                      labelFormatter={(label) => `Producto: ${label}`}
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    />
                    <Bar
                      dataKey={productMetric === "revenue" ? "revenue" : "quantity"}
                      fill={productMetric === "revenue" ? "#10B981" : "#8B5CF6"}
                      radius={[0, 6, 6, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
              No hay productos registrados en la categoría o período seleccionado.
            </p>
          )}
        </section>

        {/* Detailed Rankings Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Selling Items */}
          <section className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5">
            <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                Top Productos Más Vendidos
              </h2>
            </div>

            <div className="space-y-4">
              {data.topSellingItems.map((item, index) => {
                const badgeColor =
                  index === 0
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : index === 1
                      ? "bg-slate-400/20 text-slate-300 border-slate-400/30"
                      : index === 2
                        ? "bg-amber-700/20 text-amber-500 border-amber-700/30"
                        : "bg-white/5 text-[#E0E0E0]/60 border-white/5";

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#181818] border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-black ${badgeColor}`}
                      >
                        #{index + 1}
                      </span>
                      <span className="font-bold text-[#E0E0E0] uppercase text-sm">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#E0E0E0]">
                        {item.quantity} vendidos
                      </p>
                      <p className="text-xs font-bold text-emerald-400">
                        ${item.revenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {data.topSellingItems.length === 0 && (
                <p className="py-8 text-center text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
                  No hay ventas registradas aún.
                </p>
              )}
            </div>
          </section>

          {/* Sales by Source */}
          <section className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5">
            <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                <Store className="h-5 w-5 text-secondary" />
                Ventas por Canal / Fuente
              </h2>
            </div>

            <div className="space-y-4">
              {Object.entries(data.salesBySource).map(([source, stats]) => (
                <div
                  key={source}
                  className="p-4 rounded-xl bg-[#181818] border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-secondary/10 p-2.5 text-secondary">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#E0E0E0] uppercase text-sm block">
                        {source}
                      </span>
                      <span className="text-xs text-[#E0E0E0]/40 font-medium">
                        {stats.count} órdenes procesadas
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-[#E0E0E0]">
                      ${stats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
              {Object.keys(data.salesBySource).length === 0 && (
                <p className="py-8 text-center text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
                  No hay fuentes registradas.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Top Customers Section */}
        <section className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5">
          <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Mejores Clientes
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-black text-[#E0E0E0]/40 uppercase tracking-wider">
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3 text-right">Gasto Total</th>
                  <th className="py-3 px-3 text-right">Puntos Lealtad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.customers.topCustomers.map((customer, index) => (
                  <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                          {customer.name.substring(0, 2).toUpperCase()}
                        </span>
                        <span className="font-bold text-[#E0E0E0] uppercase">{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right text-base font-black text-emerald-400">
                      ${customer.totalSpend.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-400 uppercase tracking-widest border border-purple-500/20">
                        {customer.loyaltyPoints} pts
                      </span>
                    </td>
                  </tr>
                ))}
                {data.customers.topCustomers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
                      No hay clientes registrados en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

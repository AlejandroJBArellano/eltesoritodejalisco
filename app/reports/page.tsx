"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  customers: {
    topCustomers: { name: string; totalSpend: number; loyaltyPoints: number }[];
    newCustomersCount: number;
  };
};

type Period = "today" | "7days" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  "7days": "Últimos 7 días",
  month: "Mes Actual",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("7days");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchData = async (p: Period) => {
    try {
      setIsLoading(true);
      setSelectedDay(null);
      const response = await fetch(`/api/reports?period=${p}`);
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

  useEffect(() => {
    fetchData(period);
  }, [period]);

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] text-gray-400">
        Cargando reportes...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] text-red-600">
        Error: {errorMessage}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#121212] pb-12">
      {/* Header */}
      <header className="bg-[#242424] shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-[#E0E0E0]">
              Reportes & Analytics
            </h1>
            <p className="text-sm text-gray-400">
              {PERIOD_LABELS[period]}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400 mr-2">Ver estadísticas de:</span>
          {(["today", "7days", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-[#242424] text-gray-400 hover:bg-[#2a2a2a] hover:text-white"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-lg bg-[#242424] p-6 shadow-md border-l-4 border-green-500">
            <p className="text-sm font-medium text-gray-400">Venta Bruta</p>
            <p className="mt-2 text-2xl font-bold text-[#E0E0E0]">
              ${data.summary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Total ingresado a caja
            </p>
          </div>
          <div className="rounded-lg bg-[#242424] p-6 shadow-md border-l-4 border-red-500">
            <p className="text-sm font-medium text-gray-400">Gastos Generales</p>
            <p className="mt-2 text-2xl font-bold text-red-400">
              -${(data.summary.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Insumos, sueldos, etc.
            </p>
          </div>
          <div className="rounded-lg bg-[#242424] p-6 shadow-md border-l-4 border-gray-500">
            <p className="text-sm font-medium text-gray-400">Pérdidas por Cobro</p>
            <p className="mt-2 text-2xl font-bold text-gray-400">
              ${(data.summary.totalUncollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Falla de terminal / Cliente se fue
            </p>
          </div>
          <div className="rounded-lg bg-[#242424] p-6 shadow-md border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-400">Utilidad Neta</p>
            <p className="mt-2 text-2xl font-bold text-blue-400">
              ${(data.summary.totalSales - (data.summary.totalExpenses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Dinero Real (Ventas - Gastos)
            </p>
          </div>
          <div className="rounded-lg bg-[#242424] p-6 shadow-md border-l-4 border-purple-500">
            <p className="text-sm font-medium text-gray-400">Ticket Promedio</p>
            <p className="mt-2 text-2xl font-bold text-[#E0E0E0]">
              ${data.summary.averageTicket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Promedio por orden
            </p>
          </div>
          <div className="rounded-lg bg-[#242424] p-6 shadow-md border-l-4 border-yellow-500">
            <p className="text-sm font-medium text-gray-400">Tiempo Preparación</p>
            <p className="mt-2 text-2xl font-bold text-[#E0E0E0]">
              {Math.round(data.summary.averageCompletionTimeMinutes)} <span className="text-sm font-medium text-gray-400">min</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Promedio por orden
            </p>
          </div>
          <div className="rounded-lg bg-[#242424] p-6 shadow-md border-l-4 border-orange-500">
            <p className="text-sm font-medium text-gray-400">Nuevos Clientes</p>
            <p className="mt-2 text-2xl font-bold text-[#E0E0E0]">
              {data.customers.newCustomersCount}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              En el periodo seleccionado
            </p>
          </div>
        </div>

        {/* Interactive Sales Chart */}
        <section className="rounded-lg bg-[#242424] p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#E0E0E0]">
                Ventas por Día
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Haz clic en una barra para ver los productos más vendidos ese día
              </p>
            </div>
            {selectedDay && (
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                ✕ Cerrar detalle
              </button>
            )}
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
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
                    contentStyle={{ backgroundColor: "#1F2937", borderColor: "#374151", color: "#FFF" }}
                    formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Ventas"]}
                    cursor={{ fill: "rgba(59,130,246,0.1)" }}
                  />
                  <Bar
                    dataKey="total"
                    radius={[4, 4, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(barData) => {
                      const date = (barData.payload as { date: string })?.date;
                      if (date) setSelectedDay((prev) => prev === date ? null : date);
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
            <p className="py-16 text-center text-gray-400">
              No hay datos de ventas en el periodo seleccionado.
            </p>
          )}

          {/* Day Drill-Down Panel */}
          {selectedDay && (
            <div className="mt-4 rounded-lg bg-[#181818] border border-yellow-500/40 p-4">
              <h3 className="text-sm font-bold text-yellow-400 mb-3 uppercase tracking-wider">
                📊 Top productos —{" "}
                {new Date(`${selectedDay}T12:00:00-06:00`).toLocaleDateString("es-MX", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "America/Mexico_City",
                })}
              </h3>
              {selectedDayItems.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/20 text-xs font-bold text-yellow-400">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-[#E0E0E0]">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#E0E0E0]">{item.quantity} vendidos</span>
                        <span className="ml-3 text-xs text-gray-400">
                          ${item.revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No hay detalle de productos para este día.</p>
              )}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Selling Items */}
          <section className="rounded-lg bg-[#242424] p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-[#E0E0E0]">
              Productos Más Vendidos
            </h2>
            <div className="space-y-4">
              {data.topSellingItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#121212] text-xs font-bold text-gray-400">
                      {index + 1}
                    </span>
                    <span className="font-medium text-[#E0E0E0]">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#E0E0E0]">
                      {item.quantity} vendidos
                    </p>
                    <p className="text-xs text-gray-400">
                      ${item.revenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              {data.topSellingItems.length === 0 && (
                <p className="text-sm text-gray-400">No hay datos aún.</p>
              )}
            </div>
          </section>

          {/* Sales by Source */}
          <section className="rounded-lg bg-[#242424] p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-[#E0E0E0]">
              Ventas por Fuente
            </h2>
            <div className="space-y-4">
              {Object.entries(data.salesBySource).map(([source, stats]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="font-medium text-[#E0E0E0]">{source}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#E0E0E0]">
                      ${stats.total.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {stats.count} órdenes
                    </p>
                  </div>
                </div>
              ))}
              {Object.keys(data.salesBySource).length === 0 && (
                <p className="text-sm text-gray-400">No hay datos aún.</p>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-1">
          {/* Top Customers */}
          <section className="rounded-lg bg-[#242424] p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-[#E0E0E0]">
              Mejores Clientes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-400">
                    <th className="py-2">Cliente</th>
                    <th className="py-2 text-right">Gasto Total</th>
                    <th className="py-2 text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.topCustomers.map((customer, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-3 font-medium text-[#E0E0E0]">
                        {customer.name}
                      </td>
                      <td className="py-3 text-right text-[#E0E0E0] font-bold">
                        ${customer.totalSpend.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-purple-600">
                        {customer.loyaltyPoints}
                      </td>
                    </tr>
                  ))}
                  {data.customers.topCustomers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-400">
                        No hay clientes registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


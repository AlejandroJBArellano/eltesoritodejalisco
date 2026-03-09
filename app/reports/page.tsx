"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReportData = {
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
  salesBySource: Record<string, { count: number; total: number }>;
  topSellingItems: { name: string; quantity: number; revenue: number }[];
  customers: {
    topCustomers: { name: string; totalSpend: number; loyaltyPoints: number }[];
    newCustomersCount: number;
  };
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/reports");
        if (!response.ok) throw new Error("Error al cargar reportes");
        const json = await response.json();
        // Calculate sales by source properly if returned as object
        setData(json);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error desconocido",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.salesByDay).map(([date, total]) => ({
      date,
      total,
    }));
  }, [data]);

  const maxSales = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.max(...chartData.map((d) => d.total));
  }, [chartData]);

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
              Resumen de los últimos 7 días
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
              En la última semana
            </p>
          </div>
        </div>

        {/* Sales Chart */}
        <section className="rounded-lg bg-[#242424] p-6 shadow-md">
          <h2 className="mb-6 text-lg font-bold text-[#E0E0E0]">
            Ventas por Día
          </h2>
          <div className="flex h-64 items-end gap-4 border-b border-l border-gray-200 p-4">
            {chartData.length > 0 ? (
              chartData.map((d) => (
                <div
                  key={d.date}
                  className="group relative flex-1 bg-blue-500 hover:bg-blue-600 transition-all rounded-t"
                  style={{
                    height: `${(d.total / maxSales) * 100}%`,
                    minHeight: "4px",
                  }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    ${d.total}
                  </div>
                  <div className="absolute top-full left-1/2 mt-2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(`${d.date}T12:00:00-06:00`).toLocaleDateString("es-MX", {
                      weekday: "short",
                      timeZone: "America/Mexico_City",
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="w-full text-center text-gray-400 self-center">
                No hay datos de ventas recientes.
              </p>
            )}
          </div>
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

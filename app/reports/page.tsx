"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReportData = {
  summary: {
    totalSales: number;
    totalOrders: number;
    averageTicket: number;
  };
  salesByDay: Record<string, number>;
  salesBySource: Record<string, { count: number; total: number }>;
  topSellingItems: { name: string; quantity: number; revenue: number }[];
  inventory: {
    lowStockCount: number;
    totalStockValue: number;
    lowStockItems: { name: string; stock: number; min: number }[];
  };
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
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-600">
        Cargando reportes...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-red-600">
        Error: {errorMessage}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Reportes & Analytics
            </h1>
            <p className="text-sm text-gray-600">
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ${data.summary.totalSales.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-green-600">
              {data.summary.totalOrders} órdenes completadas
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ${data.summary.averageTicket.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-sm font-medium text-gray-600">
              Valor de Inventario
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ${data.inventory.totalStockValue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-red-600">
              {data.inventory.lowStockCount} ítems en stock bajo
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-sm font-medium text-gray-600">Nuevos Clientes</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {data.customers.newCustomersCount}
            </p>
            <p className="mt-1 text-xs text-blue-600">En la última semana</p>
          </div>
        </div>

        {/* Sales Chart */}
        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-lg font-bold text-gray-900">
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
                  <div className="absolute top-full left-1/2 mt-2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(d.date).toLocaleDateString("es-MX", {
                      weekday: "short",
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="w-full text-center text-gray-500 self-center">
                No hay datos de ventas recientes.
              </p>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Selling Items */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Productos Más Vendidos
            </h2>
            <div className="space-y-4">
              {data.topSellingItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {item.quantity} vendidos
                    </p>
                    <p className="text-xs text-gray-500">
                      ${item.revenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
              {data.topSellingItems.length === 0 && (
                <p className="text-sm text-gray-500">No hay datos aún.</p>
              )}
            </div>
          </section>

          {/* Sales by Source */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Ventas por Fuente
            </h2>
            <div className="space-y-4">
              {Object.entries(data.salesBySource).map(([source, stats]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{source}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ${stats.total.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {stats.count} órdenes
                    </p>
                  </div>
                </div>
              ))}
              {Object.keys(data.salesBySource).length === 0 && (
                <p className="text-sm text-gray-500">No hay datos aún.</p>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Low Stock Alert */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-red-600">
              ⚠️ Alerta de Stock Bajo
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2">Ingrediente</th>
                    <th className="py-2 text-right">Actual</th>
                    <th className="py-2 text-right">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.lowStockItems.map((item, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-3 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="py-3 text-right text-red-600 font-bold">
                        {item.stock}
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {item.min}
                      </td>
                    </tr>
                  ))}
                  {data.inventory.lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-green-600">
                        Todo el inventario está en orden ✅
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top Customers */}
          <section className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Mejores Clientes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2">Cliente</th>
                    <th className="py-2 text-right">Gasto Total</th>
                    <th className="py-2 text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.topCustomers.map((customer, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-3 font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="py-3 text-right text-gray-900 font-bold">
                        ${customer.totalSpend.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-purple-600">
                        {customer.loyaltyPoints}
                      </td>
                    </tr>
                  ))}
                  {data.customers.topCustomers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500">
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

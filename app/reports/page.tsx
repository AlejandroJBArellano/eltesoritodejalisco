// TesoritoOS - Reports & Analytics Page
// Interface for viewing reports and analytics

import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-100">
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
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Exportar PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <span className="text-6xl">📊</span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Módulo de Reportes en Construcción
          </h2>
          <p className="mt-2 text-gray-600">
            Analytics y reportes de ventas, inventario y efectividad de
            marketing.
          </p>
        </div>

        {/* Feature Preview */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">💰 Ventas</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Ventas por día/semana/mes</li>
              <li>• Productos más vendidos</li>
              <li>• Ticket promedio</li>
              <li>• Horarios pico</li>
              <li>• Comparativas</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              📦 Inventario
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Consumo por ingrediente</li>
              <li>• Costo de productos</li>
              <li>• Desperdicio estimado</li>
              <li>• Productos de bajo movimiento</li>
              <li>• Historial de ajustes</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              📱 Marketing
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Ventas por fuente</li>
              <li>• ROI de campañas</li>
              <li>• Tasa de conversión</li>
              <li>• Clientes por canal</li>
              <li>• Gasto promedio por fuente</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              👥 Clientes
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Clientes nuevos vs recurrentes</li>
              <li>• Programa de lealtad</li>
              <li>• Frecuencia de visitas</li>
              <li>• Lifetime value</li>
              <li>• Cumpleaños del mes</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              ⏱️ Operaciones
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Tiempo promedio de preparación</li>
              <li>• Órdenes por hora</li>
              <li>• Eficiencia de cocina</li>
              <li>• Órdenes tardías</li>
              <li>• Performance por turno</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              📈 Tendencias
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Análisis predictivo</li>
              <li>• Proyecciones de ventas</li>
              <li>• Estacionalidad</li>
              <li>• Patrones de consumo</li>
              <li>• Recomendaciones automáticas</li>
            </ul>
          </div>
        </div>

        {/* Report Example */}
        <div className="mt-8 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-6">
          <h3 className="mb-4 text-lg font-bold text-purple-900">
            🎯 Ejemplo: Efectividad de Marketing
          </h3>
          <div className="rounded-lg bg-white p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Fuente</th>
                  <th className="py-2 text-right">Clientes</th>
                  <th className="py-2 text-right">Ventas</th>
                  <th className="py-2 text-right">Ticket Promedio</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b">
                  <td className="py-2">TikTok</td>
                  <td className="py-2 text-right">45</td>
                  <td className="py-2 text-right">$12,350</td>
                  <td className="py-2 text-right">$274</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Instagram</td>
                  <td className="py-2 text-right">32</td>
                  <td className="py-2 text-right">$8,960</td>
                  <td className="py-2 text-right">$280</td>
                </tr>
                <tr>
                  <td className="py-2">Pasaba por ahí</td>
                  <td className="py-2 text-right">28</td>
                  <td className="py-2 text-right">$6,720</td>
                  <td className="py-2 text-right">$240</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

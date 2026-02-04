import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">🍽️ TesoritoOS</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sistema de Gestión para Restaurantes
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Órdenes Activas
                </p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
                <p className="text-2xl font-bold text-gray-900">$4,850</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center">
              <div className="rounded-full bg-yellow-100 p-3">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-100 p-3">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clientes</p>
                <p className="text-2xl font-bold text-gray-900">248</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Modules */}
        <div className="mb-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Módulos Principales
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Kitchen Display System */}
            <Link href="/kitchen">
              <div className="group cursor-pointer rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-4xl">👨‍🍳</span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    Real-time
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  Sistema de Cocina
                </h3>
                <p className="text-sm text-gray-600">
                  KDS con temporizador, vista Kanban y smart batching
                </p>
              </div>
            </Link>

            {/* POS */}
            <Link href="/pos">
              <div className="group cursor-pointer rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-4xl">🧾</span>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    Activo
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  Punto de Venta
                </h3>
                <p className="text-sm text-gray-600">
                  Crear órdenes, gestionar mesas y procesar pagos
                </p>
              </div>
            </Link>

            {/* Inventory */}
            <Link href="/inventory">
              <div className="group cursor-pointer rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-4xl">📦</span>
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                    Automático
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  Inventario
                </h3>
                <p className="text-sm text-gray-600">
                  Gestión de ingredientes con desconteo automático
                </p>
              </div>
            </Link>

            {/* Menu Management */}
            <Link href="/menu">
              <div className="group cursor-pointer rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-xl">
                <div className="mb-4">
                  <span className="text-4xl">🍽️</span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  Gestión de Menú
                </h3>
                <p className="text-sm text-gray-600">
                  Administrar productos, precios y recetas
                </p>
              </div>
            </Link>

            {/* Customers */}
            <Link href="/customers">
              <div className="group cursor-pointer rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-4xl">👥</span>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                    CRM
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  Clientes
                </h3>
                <p className="text-sm text-gray-600">
                  CRM con programa de lealtad y tracking de fuentes
                </p>
              </div>
            </Link>

            {/* Reports */}
            <Link href="/reports">
              <div className="group cursor-pointer rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-xl">
                <div className="mb-4">
                  <span className="text-4xl">📊</span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  Reportes
                </h3>
                <p className="text-sm text-gray-600">
                  Analytics y reportes de ventas, inventario y marketing
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h3 className="mb-4 text-lg font-bold text-gray-900">
            Acciones Rápidas
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/pos">
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                + Nueva Orden
              </button>
            </Link>
            <Link href="/kitchen">
              <button className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                Ver Cocina
              </button>
            </Link>
            <Link href="/inventory">
              <button className="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700">
                Ajustar Stock
              </button>
            </Link>
            <Link href="/reports">
              <button className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
                Ver Reportes
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

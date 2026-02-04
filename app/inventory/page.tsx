// TesoritoOS - Inventory Management Page
// Interface for managing ingredients and stock

import Link from 'next/link';

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              + Nuevo Ingrediente
            </button>
            <button className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
              Ajustar Stock
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <span className="text-6xl">📦</span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Módulo de Inventario en Construcción
          </h2>
          <p className="mt-2 text-gray-600">
            Aquí podrás gestionar ingredientes, recetas y stock en tiempo real.
          </p>
        </div>

        {/* Feature Preview */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              🎯 Desconteo Automático (Implementado)
            </h3>
            <p className="text-sm text-gray-600">
              El sistema ya cuenta con la lógica para descontar automáticamente los ingredientes
              cuando se completa una orden, basándose en las recetas configuradas.
            </p>
            <div className="mt-4 rounded-lg bg-green-50 p-3">
              <p className="text-xs font-semibold text-green-800">
                ✓ API: /api/inventory/deduct
              </p>
              <p className="text-xs text-green-700">
                ✓ Servicio: lib/services/inventory.ts
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              📊 Características Disponibles
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ CRUD de ingredientes (API lista)</li>
              <li>✅ Ajustes manuales con historial</li>
              <li>✅ Alertas de stock bajo</li>
              <li>✅ Relación con recetas</li>
              <li>🚧 Interfaz visual (próximamente)</li>
            </ul>
          </div>
        </div>

        {/* API Documentation */}
        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-3 text-lg font-bold text-blue-900">
            💡 APIs Disponibles
          </h3>
          <div className="space-y-2 text-sm">
            <div className="rounded bg-white p-3">
              <code className="font-mono text-blue-600">GET /api/inventory</code>
              <p className="mt-1 text-gray-600">Obtener todos los ingredientes</p>
            </div>
            <div className="rounded bg-white p-3">
              <code className="font-mono text-blue-600">POST /api/inventory</code>
              <p className="mt-1 text-gray-600">Crear nuevo ingrediente</p>
            </div>
            <div className="rounded bg-white p-3">
              <code className="font-mono text-blue-600">PATCH /api/inventory/adjust</code>
              <p className="mt-1 text-gray-600">Ajustar stock manualmente</p>
            </div>
            <div className="rounded bg-white p-3">
              <code className="font-mono text-blue-600">POST /api/inventory/deduct</code>
              <p className="mt-1 text-gray-600">Desconteo automático por orden</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// TesoritoOS - POS (Point of Sale) Page
// Interface for waiters to create orders

import Link from "next/link";

export default function POSPage() {
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
            <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
              Crear Orden
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <span className="text-6xl">🚧</span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Módulo POS en Construcción
          </h2>
          <p className="mt-2 text-gray-600">
            Esta página permitirá a los meseros crear y gestionar órdenes.
          </p>
          <div className="mt-6">
            <Link href="/kitchen">
              <button className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
                Ir a Sistema de Cocina
              </button>
            </Link>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2 font-bold text-gray-900">✅ Próximamente</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Selección de productos del menú</li>
              <li>• Gestión de mesas</li>
              <li>• Notas especiales por ítem</li>
              <li>• Captura de fuente de visita</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2 font-bold text-gray-900">💡 Características</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Interfaz táctil optimizada</li>
              <li>• División de cuentas</li>
              <li>• Propinas configurables</li>
              <li>• Impresión automática</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2 font-bold text-gray-900">🔗 Integración</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Envío directo a cocina</li>
              <li>• Programa de lealtad</li>
              <li>• Pagos múltiples</li>
              <li>• Facturas automáticas</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

// TesoritoOS - Menu Management Page
// Interface for managing menu items and recipes

import Link from 'next/link';

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Menú</h1>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              + Nuevo Producto
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <span className="text-6xl">🍽️</span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Módulo de Menú en Construcción
          </h2>
          <p className="mt-2 text-gray-600">
            Gestión de productos, precios, categorías y recetas.
          </p>
        </div>

        {/* Feature Preview */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">✅ Próximamente</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• CRUD de productos del menú</li>
              <li>• Gestión de categorías</li>
              <li>• Configuración de precios</li>
              <li>• Disponibilidad por horario</li>
              <li>• Imágenes de productos</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">🔗 Recetas</h3>
            <p className="text-sm text-gray-600">
              Relaciona cada producto del menú con los ingredientes necesarios
              para su preparación. Esto permite el desconteo automático de inventario.
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-800">
                Ejemplo: Torta Ahogada
              </p>
              <ul className="mt-2 text-xs text-blue-700">
                <li>• 1 Pan Telera</li>
                <li>• 0.15 kg Carne Vegana</li>
                <li>• 0.1 lt Salsa Ahogada</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

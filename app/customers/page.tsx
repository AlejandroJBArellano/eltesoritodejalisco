// TesoritoOS - Customers & CRM Page
// Interface for managing customers and loyalty program

import Link from 'next/link';

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Clientes & CRM</h1>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              + Registrar Cliente
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <span className="text-6xl">👥</span>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Módulo CRM en Construcción
          </h2>
          <p className="mt-2 text-gray-600">
            Gestión de clientes, programa de lealtad y tracking de fuentes.
          </p>
        </div>

        {/* Feature Preview */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              💎 Programa de Lealtad
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="rounded-lg bg-purple-50 p-3">
                <p className="font-semibold text-purple-900">$10 pesos = 1 punto</p>
              </div>
              <p>Sistema de puntos automático que se suma con cada compra.</p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              📱 Tracking de Fuentes
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• TikTok</li>
              <li>• Instagram</li>
              <li>• Pasaba por ahí</li>
              <li>• Recomendación</li>
              <li>• Personalizado</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              📊 Analytics
            </h3>
            <p className="text-sm text-gray-600">
              Mide la efectividad de tus campañas de marketing y conoce de dónde
              vienen tus mejores clientes.
            </p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-3 text-lg font-bold text-blue-900">
            📝 Información de Clientes
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-white p-4">
              <h4 className="mb-2 font-semibold text-gray-900">Datos Básicos</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Nombre completo</li>
                <li>• Teléfono (para WhatsApp)</li>
                <li>• Email (opcional)</li>
                <li>• Fecha de cumpleaños</li>
              </ul>
            </div>
            <div className="rounded-lg bg-white p-4">
              <h4 className="mb-2 font-semibold text-gray-900">Métricas</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Puntos de lealtad actuales</li>
                <li>• Total gastado histórico</li>
                <li>• Fuente de adquisición</li>
                <li>• Última visita</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

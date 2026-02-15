import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-dark/5">
            <div className="flex items-center">
              <div className="rounded-xl bg-primary/10 p-3 text-primary text-2xl">
                📋
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-dark/50 uppercase tracking-wider">
                  Órdenes Activas
                </p>
                <p className="text-3xl font-black text-dark tracking-tight">12</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-dark/5">
            <div className="flex items-center">
              <div className="rounded-xl bg-secondary/10 p-3 text-secondary text-2xl">
                💰
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-dark/50 uppercase tracking-wider">Ventas Hoy</p>
                <p className="text-3xl font-black text-dark tracking-tight">$4,850</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-dark/5">
            <div className="flex items-center">
              <div className="rounded-xl bg-warning/10 p-3 text-warning text-2xl">
                📦
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-dark/50 uppercase tracking-wider">Stock Bajo</p>
                <p className="text-3xl font-black text-dark tracking-tight">3</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-dark/5">
            <div className="flex items-center">
              <div className="rounded-xl bg-success/10 p-3 text-success text-2xl">
                👥
              </div>
              <div className="ml-4">
                <p className="text-sm font-bold text-dark/50 uppercase tracking-wider">Clientes</p>
                <p className="text-3xl font-black text-dark tracking-tight">248</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Modules */}
        <div className="mb-8">
          <h2 className="mb-8 text-2xl font-black text-dark tracking-tight">
            Módulos Principales
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Kitchen Display System */}
            <Link href="/kitchen">
              <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-5xl">👨‍🍳</span>
                  <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-black text-primary uppercase tracking-widest">
                    Real-time
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">
                  Sistema de Cocina
                </h3>
                <p className="text-sm text-dark/60 font-medium leading-relaxed">
                  KDS con temporizador, vista Kanban y smart batching inteligente.
                </p>
              </div>
            </Link>

            {/* POS */}
            <Link href="/pos">
              <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-5xl">🧾</span>
                  <span className="rounded-full bg-secondary/10 px-4 py-1 text-xs font-black text-secondary uppercase tracking-widest">
                    Activo
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">
                  Punto de Venta
                </h3>
                <p className="text-sm text-dark/60 font-medium leading-relaxed">
                  Crear órdenes, gestionar mesas y procesar pagos con ticket profesional.
                </p>
              </div>
            </Link>

            {/* Inventory */}
            <Link href="/inventory">
              <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-5xl">📦</span>
                  <span className="rounded-full bg-warning/10 px-4 py-1 text-xs font-black text-warning uppercase tracking-widest">
                    Automático
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">
                  Inventario
                </h3>
                <p className="text-sm text-dark/60 font-medium leading-relaxed">
                  Gestión de ingredientes con descuento automático vía DB Triggers.
                </p>
              </div>
            </Link>

            {/* Menu Management */}
            <Link href="/menu">
              <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-6">
                  <span className="text-5xl">🍽️</span>
                </div>
                <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">
                  Gestión de Menú
                </h3>
                <p className="text-sm text-dark/60 font-medium leading-relaxed">
                  Administrar productos, precios, fotos y recetas técnicas.
                </p>
              </div>
            </Link>

            {/* Customers */}
            <Link href="/customers">
              <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-5xl">👥</span>
                  <span className="rounded-full bg-success/10 px-4 py-1 text-xs font-black text-success uppercase tracking-widest">
                    CRM
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">
                  Clientes
                </h3>
                <p className="text-sm text-dark/60 font-medium leading-relaxed">
                  CRM con programa de lealtad y seguimiento de fuentes de visita.
                </p>
              </div>
            </Link>

            {/* Reports */}
            <Link href="/reports">
              <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-6">
                  <span className="text-5xl">📊</span>
                </div>
                <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">
                  Reportes
                </h3>
                <p className="text-sm text-dark/60 font-medium leading-relaxed">
                  Analytics avanzados de ventas, mermas y efectividad de marketing.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl bg-dark p-8 shadow-2xl">
          <h3 className="mb-6 text-lg font-black text-white uppercase tracking-widest">
            Acciones Rápidas
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/pos">
              <button className="rounded-xl bg-secondary px-6 py-3 text-sm font-black text-white hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20">
                + NUEVA ORDEN
              </button>
            </Link>
            <Link href="/kitchen">
              <button className="rounded-xl bg-primary px-6 py-3 text-sm font-black text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                VER COCINA
              </button>
            </Link>
            <Link href="/inventory">
              <button className="rounded-xl bg-warning px-6 py-3 text-sm font-black text-dark hover:bg-warning/90 transition-all shadow-lg shadow-warning/20">
                AJUSTAR STOCK
              </button>
            </Link>
            <Link href="/reports">
              <button className="rounded-xl bg-success px-6 py-3 text-sm font-black text-white hover:bg-success/90 transition-all shadow-lg shadow-success/20">
                VER REPORTES
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

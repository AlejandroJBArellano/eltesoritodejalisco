import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  // Redirección automática para el Chef
  if (profile.role === "CHEF") {
    redirect("/kitchen");
  }

  const isAdmin = profile.role === "ADMIN" || profile.role === "MANAGER";
  const isWaiter = profile.role === "WAITER";

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-dark tracking-tight">
            ¡Hola, {profile.full_name || profile.email.split('@')[0]}! 👋
          </h1>
          <p className="text-dark/50 font-bold uppercase tracking-widest text-xs mt-2">
            Rol: <span className="text-primary">{profile.role}</span>
          </p>
        </div>

        {/* Quick Stats - Only for Admins */}
        {isAdmin && (
          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-dark/5">
              <div className="flex items-center">
                <div className="rounded-xl bg-primary/10 p-3 text-primary text-2xl">📋</div>
                <div className="ml-4">
                  <p className="text-sm font-bold text-dark/50 uppercase tracking-wider">Órdenes Activas</p>
                  <p className="text-3xl font-black text-dark tracking-tight">12</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-dark/5">
              <div className="flex items-center">
                <div className="rounded-xl bg-secondary/10 p-3 text-secondary text-2xl">💰</div>
                <div className="ml-4">
                  <p className="text-sm font-bold text-dark/50 uppercase tracking-wider">Ventas Hoy</p>
                  <p className="text-3xl font-black text-dark tracking-tight">$4,850</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-dark/5">
              <div className="flex items-center">
                <div className="rounded-xl bg-warning/10 p-3 text-warning text-2xl">📦</div>
                <div className="ml-4">
                  <p className="text-sm font-bold text-dark/50 uppercase tracking-wider">Stock Bajo</p>
                  <p className="text-3xl font-black text-dark tracking-tight">3</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-dark/5">
              <div className="flex items-center">
                <div className="rounded-xl bg-success/10 p-3 text-success text-2xl">👥</div>
                <div className="ml-4">
                  <p className="text-sm font-bold text-dark/50 uppercase tracking-wider">Clientes</p>
                  <p className="text-3xl font-black text-dark tracking-tight">248</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Modules */}
        <div className="mb-8">
          <h2 className="mb-8 text-2xl font-black text-dark tracking-tight uppercase">
            Módulos Disponibles
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Kitchen System - Everyone can see but Chef is redirected */}
            <Link href="/kitchen">
              <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-5xl">👨‍🍳</span>
                  <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-black text-primary uppercase tracking-widest">Real-time</span>
                </div>
                <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">Sistema de Cocina</h3>
                <p className="text-sm text-dark/60 font-medium leading-relaxed">KDS con temporizador y smart batching.</p>
              </div>
            </Link>

            {/* POS - Admin and Waiter */}
            {(isAdmin || isWaiter) && (
              <Link href="/pos">
                <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-5xl">🧾</span>
                    <span className="rounded-full bg-secondary/10 px-4 py-1 text-xs font-black text-secondary uppercase tracking-widest">Activo</span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">Punto de Venta</h3>
                  <p className="text-sm text-dark/60 font-medium leading-relaxed">Crear órdenes y procesar pagos.</p>
                </div>
              </Link>
            )}

            {/* Inventory - Admin */}
            {isAdmin && (
              <Link href="/inventory">
                <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-5xl">📦</span>
                    <span className="rounded-full bg-warning/10 px-4 py-1 text-xs font-black text-warning uppercase tracking-widest">Stock</span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">Inventario</h3>
                  <p className="text-sm text-dark/60 font-medium leading-relaxed">Gestión de insumos y mermas.</p>
                </div>
              </Link>
            )}

            {/* Menu - Admin */}
            {isAdmin && (
              <Link href="/menu">
                <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="mb-6"><span className="text-5xl">🍽️</span></div>
                  <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">Gestión de Menú</h3>
                  <p className="text-sm text-dark/60 font-medium leading-relaxed">Productos y recetas técnicas.</p>
                </div>
              </Link>
            )}

            {/* Customers - Admin and Waiter */}
            {(isAdmin || isWaiter) && (
              <Link href="/customers">
                <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-5xl">👥</span>
                    <span className="rounded-full bg-success/10 px-4 py-1 text-xs font-black text-success uppercase tracking-widest">CRM</span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">Clientes</h3>
                  <p className="text-sm text-dark/60 font-medium leading-relaxed">Lealtad y fuentes de visita.</p>
                </div>
              </Link>
            )}

            {/* Reports - Admin */}
            {isAdmin && (
              <Link href="/reports">
                <div className="group cursor-pointer rounded-2xl bg-white p-8 shadow-sm border border-dark/5 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="mb-6"><span className="text-5xl">📊</span></div>
                  <h3 className="mb-2 text-xl font-black text-dark tracking-tight uppercase">Reportes</h3>
                  <p className="text-sm text-dark/60 font-medium leading-relaxed">Ventas y métricas de negocio.</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl bg-dark p-8 shadow-2xl">
          <h3 className="mb-6 text-lg font-black text-white uppercase tracking-widest">Acciones Rápidas</h3>
          <div className="flex flex-wrap gap-4">
            {(isAdmin || isWaiter) && (
              <Link href="/pos">
                <button className="rounded-xl bg-secondary px-6 py-3 text-sm font-black text-white hover:bg-secondary/90 transition-all">
                  + NUEVA ORDEN
                </button>
              </Link>
            )}
            <Link href="/kitchen">
              <button className="rounded-xl bg-primary px-6 py-3 text-sm font-black text-white hover:bg-primary/90 transition-all">
                VER COCINA
              </button>
            </Link>
            {isAdmin && (
              <Link href="/inventory">
                <button className="rounded-xl bg-warning px-6 py-3 text-sm font-black text-dark hover:bg-warning/90 transition-all">
                  AJUSTAR STOCK
                </button>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

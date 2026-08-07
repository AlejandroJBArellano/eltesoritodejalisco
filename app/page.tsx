import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { MEX_TIMEZONE } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  DollarSign,
  Users,
  HandCoins,
  ChefHat,
  Receipt,
  BookOpen,
  UtensilsCrossed,
  CheckSquare,
  ClipboardCheck,
  Clock,
  UserCog,
  BarChart3,
  ReceiptText,
  ArrowUpRight,
  Settings,
  Package,
  AlertTriangle,
} from "lucide-react";
import React from "react";
import CollapsibleSection from "@/components/CollapsibleSection";

// --- Extracted UI Components for Dashboard ---

interface StatCardProps {
  title: string;
  icon: React.ElementType;
  value: React.ReactNode;
  themeClass: string;
}

function StatCard({ title, icon: Icon, value, themeClass }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-card p-3 sm:p-6 shadow-sm border border-border transition-all hover:border-border/15">
      <div className="flex items-center justify-between sm:items-start gap-1">
        <div className="min-w-0">
          <span className="text-[9px] sm:text-xs font-bold text-text-light/50 uppercase tracking-wider block truncate">
            {title}
          </span>
          <p className="mt-0.5 sm:mt-3 text-base sm:text-3xl font-black text-text-light tracking-tight tabular-nums truncate">
            {value}
          </p>
        </div>
        <div
          className={`rounded-lg p-1.5 sm:p-3 ${themeClass} shrink-0 sm:-mt-1`}
        >
          <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

interface ModuleCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  themeClass: string;
  hoverColor: string;
  badge?: string;
}

function ModuleCard({
  title,
  description,
  href,
  icon: Icon,
  themeClass,
  hoverColor,
  badge,
}: ModuleCardProps) {
  return (
    <Link href={href} className="group cursor-pointer focus:outline-none">
      <div className="h-full rounded-2xl bg-card p-3 sm:p-8 shadow-sm border border-border transition-all hover:shadow-xl hover:-translate-y-1 hover:border-border/15 flex flex-col justify-between min-h-[90px] sm:min-h-0">
        <div>
          {/* Top section: Icon + Badge */}
          <div className="mb-2 sm:mb-6 flex items-center justify-between">
            <div className={`rounded-lg p-1.5 sm:p-3 ${themeClass}`}>
              <Icon className="h-4 w-4 sm:h-7 sm:w-7" />
            </div>
            {badge && (
              <span
                className={`rounded-full px-1.5 py-0.5 sm:px-4 sm:py-1 text-[8px] sm:text-xs font-black uppercase tracking-widest ${themeClass}`}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Content: Title */}
          <h3
            className="text-xs sm:text-xl font-black text-text-light tracking-tight uppercase transition-colors flex items-center justify-between"
            style={{ "--hover-color": hoverColor } as React.CSSProperties}
          >
            <span className="group-hover:text-[var(--hover-color)] transition-colors truncate">
              {title}
            </span>
            <ArrowUpRight className="hidden sm:block h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </h3>

          {/* Description (desktop-only) */}
          <p className="hidden sm:block mt-2 text-sm text-text-light/60 font-medium leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

// --- Main Page Component ---

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

  let activeOrdersCount = 0;
  let salesToday = 0;
  let customersCount = 0;
  let tipsToday = 0;
  let lowStockAlerts: Array<{ id: string; name: string; current_stock: number; minimum_stock: number; unit: string }> = [];

  if (isAdmin) {
    const tenant = await getTenantContext();
    const supabase = await createClient();

    const [statsResult, ingredientsResult] = await Promise.all([
      supabase.rpc("get_dashboard_stats", { p_tenant_id: tenant.id }),
      supabase
        .from("ingredients")
        .select("id, name, current_stock, minimum_stock, unit")
        .eq("tenant_id", tenant.id)
        .order("current_stock", { ascending: true }),
    ]);

    // Filter low/out-of-stock client-side (Supabase can't filter WHERE col1 <= col2 without RPC)
    lowStockAlerts = (ingredientsResult.data || []).filter(
      (ing) => ing.current_stock <= ing.minimum_stock,
    );

    if (!statsResult.error && statsResult.data && statsResult.data.length > 0) {
      const s = statsResult.data[0];
      activeOrdersCount = Number(s.active_orders || 0);
      salesToday = Number(s.sales_today || 0);
      tipsToday = Number(s.tips_today || 0);
      customersCount = Number(s.customers_count || 0);
    }
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-12 sm:px-6 lg:px-8">
        {/* === ALERTA DE STOCK BAJO / AGOTADO — Admin only === */}
        {isAdmin && lowStockAlerts.length > 0 && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/5 overflow-hidden mb-2 sm:mb-6">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-red-500/15">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-red-400">
                    Alerta de Inventario
                  </p>
                  <p className="text-[11px] text-text-light/40 font-medium">
                    {lowStockAlerts.filter((i) => i.current_stock <= 0).length} agotado(s) ·{" "}
                    {lowStockAlerts.filter((i) => i.current_stock > 0).length} bajo mínimo
                  </p>
                </div>
              </div>
              <a
                href="/inventario"
                className="text-[11px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition-all"
              >
                Ver Inventario →
              </a>
            </div>
            <div className="flex flex-wrap gap-2 px-5 py-3.5">
              {lowStockAlerts.map((ing) => {
                const isOut = ing.current_stock <= 0;
                return (
                  <div
                    key={ing.id}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border text-xs ${
                      isOut
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-amber-500/10 border-amber-500/20"
                    }`}
                  >
                    <Package
                      className={`h-3 w-3 ${isOut ? "text-red-400" : "text-amber-400"}`}
                    />
                    <span
                      className={`font-bold ${isOut ? "text-red-300" : "text-amber-300"}`}
                    >
                      {ing.name}
                    </span>
                    <span
                      className={`tabular-nums font-black ${isOut ? "text-red-400" : "text-amber-400"}`}
                    >
                      {ing.current_stock}{" "}
                      <span className="font-medium opacity-70">/ {ing.minimum_stock} mín</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Stats - Only for Admins */}
        {isAdmin && (
          <CollapsibleSection title="Resumen del Día" defaultOpen={false}>
            <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Órdenes Activas"
                icon={ClipboardList}
                value={activeOrdersCount}
                themeClass="bg-primary/10 text-primary"
              />
              <StatCard
                title="Venta Bruta"
                icon={DollarSign}
                value={new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(salesToday)}
                themeClass="bg-secondary/10 text-secondary"
              />
              <StatCard
                title="Clientes"
                icon={Users}
                value={customersCount}
                themeClass="bg-success/10 text-success"
              />
              <StatCard
                title="Propinas Hoy"
                icon={HandCoins}
                value={new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(tipsToday)}
                themeClass="bg-blue-500/10 text-blue-500"
              />
            </div>
          </CollapsibleSection>
        )}

        {/* SECCIÓN 1: OPERACIÓN DIARIA */}
        <CollapsibleSection title="Operación Diaria" dotColorClass="bg-primary">
          <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-3">
            {(isAdmin || isWaiter) && (
              <ModuleCard
                title="Punto de Venta"
                description="Crear órdenes y procesar pagos."
                href="/pos"
                icon={Receipt}
                badge="Activo"
                themeClass="bg-secondary/10 text-secondary"
                hoverColor="var(--color-secondary)"
              />
            )}
            <ModuleCard
              title="Sistema de Cocina"
              description="KDS con temporizador y smart batching."
              href="/kitchen"
              icon={ChefHat}
              badge="Real-time"
              themeClass="bg-primary/10 text-primary"
              hoverColor="var(--color-primary)"
            />
            {(isAdmin || isWaiter) && (
              <ModuleCard
                title="Tareas Diarias"
                description="Checklist de tareas primordiales y operación diaria."
                href="/tareas"
                icon={CheckSquare}
                badge="Checklist"
                themeClass="bg-primary/10 text-primary"
                hoverColor="var(--color-primary)"
              />
            )}
            <ModuleCard
              title="Asistencia"
              description="Registro de entradas y salidas."
              href="/asistencia"
              icon={Clock}
              badge="Turnos"
              themeClass="bg-purple-500/10 text-purple-500"
              hoverColor="#a855f7"
            />
          </div>
        </CollapsibleSection>

        {/* SECCIÓN 2: ADMINISTRACIÓN Y CLIENTES */}
        {(isAdmin || isWaiter) && (
          <CollapsibleSection
            title="Gestión y Clientes"
            dotColorClass="bg-success"
          >
            <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-3">
              <ModuleCard
                title="Clientes"
                description="Lealtad y fuentes de visita."
                href="/customers"
                icon={Users}
                badge="CRM"
                themeClass="bg-success/10 text-success"
                hoverColor="var(--color-success)"
              />
              {isAdmin && (
                <ModuleCard
                  title="Gestión de Menú"
                  description="Productos y recetas técnicas."
                  href="/menu"
                  icon={UtensilsCrossed}
                  themeClass="bg-primary/10 text-primary"
                  hoverColor="var(--color-primary)"
                />
              )}
              {isAdmin && (
                <ModuleCard
                  title="Inventario"
                  description="Control de stock, alertas de bajo inventario y ajustes."
                  href="/inventario"
                  icon={Package}
                  badge="Stock"
                  themeClass="bg-emerald-500/10 text-emerald-500"
                  hoverColor="#10b981"
                />
              )}
              {isAdmin && (
                <ModuleCard
                  title="Historial de Asistencia"
                  description="Filtros de horas trabajadas y registros de turno por empleado."
                  href="/asistencia/history"
                  icon={ReceiptText}
                  badge="Historial"
                  themeClass="bg-purple-500/10 text-purple-500"
                  hoverColor="#a855f7"
                />
              )}
              {isAdmin && (
                <ModuleCard
                  title="Control de Tareas"
                  description="Aprobación de tareas críticas y monitoreo de tiempos netos."
                  href="/admin/tareas"
                  icon={ClipboardCheck}
                  badge="Control"
                  themeClass="bg-blue-500/10 text-blue-500"
                  hoverColor="#3b82f6"
                />
              )}
              {isAdmin && (
                <ModuleCard
                  title="Usuarios"
                  description="Gestión de personal y roles."
                  href="/admin/users"
                  icon={UserCog}
                  themeClass="bg-primary/10 text-primary"
                  hoverColor="var(--color-primary)"
                />
              )}
              {isAdmin && (
                <ModuleCard
                  title="Horarios del Portal"
                  description="Días y horas para programar pedidos."
                  href="/admin/horarios"
                  icon={Clock}
                  badge="Config"
                  themeClass="bg-amber-500/10 text-amber-500"
                  hoverColor="#f59e0b"
                />
              )}
              {isAdmin && (
                <ModuleCard
                  title="Configuración"
                  description="Ajustes de marca, colores del portal, datos fiscales y ticket."
                  href="/admin/settings"
                  icon={Settings}
                  badge="Empresa"
                  themeClass="bg-card text-white border border-border"
                  hoverColor="var(--color-primary)"
                />
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* SECCIÓN 3: FINANZAS Y REPORTES - Admin Only */}
        {isAdmin && (
          <CollapsibleSection
            title="Finanzas y Reportes"
            dotColorClass="bg-blue-500"
          >
            <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-3">
              <ModuleCard
                title="Historial"
                description="Historial de órdenes y cobros."
                href="/history"
                icon={BookOpen}
                badge="Registro"
                themeClass="bg-blue-500/10 text-blue-500"
                hoverColor="#3b82f6"
              />
              <ModuleCard
                title="Gastos"
                description="Registro y control de gastos (insumos, sueldos, etc.)"
                href="/gastos"
                icon={ReceiptText}
                badge="NUEVO"
                themeClass="bg-red-500/10 text-red-500"
                hoverColor="#ef4444"
              />
              <ModuleCard
                title="Reportes"
                description="Ventas y métricas de negocio."
                href="/reports"
                icon={BarChart3}
                themeClass="bg-zinc-800 text-text-light"
                hoverColor="var(--color-primary)"
              />
            </div>
          </CollapsibleSection>
        )}
      </main>
    </div>
  );
}

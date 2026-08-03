import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
    <div className="rounded-2xl bg-[#242424] p-3 sm:p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
      <div className="flex items-center justify-between sm:items-start gap-1">
        <div className="min-w-0">
          <span className="text-[9px] sm:text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider block truncate">
            {title}
          </span>
          <p className="mt-0.5 sm:mt-3 text-base sm:text-3xl font-black text-[#E0E0E0] tracking-tight tabular-nums truncate">
            {value}
          </p>
        </div>
        <div className={`rounded-lg p-1.5 sm:p-3 ${themeClass} shrink-0 sm:-mt-1`}>
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
      <div className="h-full rounded-2xl bg-[#242424] p-3 sm:p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-white/10 flex flex-col justify-between min-h-[90px] sm:min-h-0">
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
            className="text-xs sm:text-xl font-black text-[#E0E0E0] tracking-tight uppercase transition-colors flex items-center justify-between"
            style={{ "--hover-color": hoverColor } as React.CSSProperties}
          >
            <span className="group-hover:text-[var(--hover-color)] transition-colors truncate">
              {title}
            </span>
            <ArrowUpRight className="hidden sm:block h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </h3>

          {/* Description (desktop-only) */}
          <p className="hidden sm:block mt-2 text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
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

  if (isAdmin) {
    const supabase = await createClient();

    // 1. Órdenes Activas
    const { count: activeCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["PENDING", "PREPARING", "READY"]);

    activeOrdersCount = activeCount || 0;

    // 2. Ventas Hoy
    const mxDateString = new Intl.DateTimeFormat("en-CA", {
      timeZone: MEX_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // Convert the start of the day in CDMX to UTC for the query
    const todayStartUTC = new Date(
      `${mxDateString}T00:00:00-06:00`,
    ).toISOString();

    const { data: todayOrders } = await supabase
      .from("orders")
      .select("total")
      .in("status", ["PAID", "DELIVERED"])
      .gte("created_at", todayStartUTC);

    salesToday = (todayOrders || []).reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    );

    // 2.5 Propinas Hoy
    const { data: todayPayments } = await supabase
      .from("payments")
      .select("tip_amount")
      .gte("created_at", todayStartUTC);

    tipsToday = (todayPayments || []).reduce(
      (sum, payment) => sum + (payment.tip_amount || 0),
      0,
    );

    // 3. Clientes
    const { count: custCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    customersCount = custCount || 0;
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-12 sm:px-6 lg:px-8">
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
          <CollapsibleSection title="Gestión y Clientes" dotColorClass="bg-success">
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
                  themeClass="bg-[#242424] text-white"
                  hoverColor="var(--color-primary)"
                />
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* SECCIÓN 3: FINANZAS Y REPORTES - Admin Only */}
        {isAdmin && (
          <CollapsibleSection title="Finanzas y Reportes" dotColorClass="bg-blue-500">
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
                themeClass="bg-zinc-800 text-[#E0E0E0]"
                hoverColor="var(--color-primary)"
              />
            </div>
          </CollapsibleSection>
        )}
      </main>
    </div>
  );
}

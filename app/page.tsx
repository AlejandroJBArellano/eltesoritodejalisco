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
} from "lucide-react";

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
    const todayStartUTC = new Date(`${mxDateString}T00:00:00-06:00`).toISOString();

    const { data: todayOrders } = await supabase
      .from("orders")
      .select("total")
      .in("status", ["PAID", "DELIVERED"])
      .gte("created_at", todayStartUTC);

    salesToday = (todayOrders || []).reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );

    // 2.5 Propinas Hoy
    const { data: todayPayments } = await supabase
      .from("payments")
      .select("tip_amount")
      .gte("created_at", todayStartUTC);

    tipsToday = (todayPayments || []).reduce(
      (sum, payment) => sum + (payment.tip_amount || 0),
      0
    );

    // 3. Clientes
    const { count: custCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    customersCount = custCount || 0;
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Quick Stats - Only for Admins */}
        {isAdmin && (
          <div className="mb-12">
            <h2 className="mb-4 text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
              Resumen del Día
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Órdenes Activas */}
              <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                    Órdenes Activas
                  </span>
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                  {activeOrdersCount}
                </p>
              </div>

              {/* Venta Bruta */}
              <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                    Venta Bruta
                  </span>
                  <div className="rounded-xl bg-secondary/10 p-3 text-secondary">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  }).format(salesToday)}
                </p>
              </div>

              {/* Clientes */}
              <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                    Clientes
                  </span>
                  <div className="rounded-xl bg-success/10 p-3 text-success">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                  {customersCount}
                </p>
              </div>

              {/* Propinas Hoy */}
              <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                    Propinas Hoy
                  </span>
                  <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
                    <HandCoins className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  }).format(tipsToday)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN 1: OPERACIÓN DIARIA */}
        <section className="mb-10">
          <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              Operación Diaria
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* POS */}
            {(isAdmin || isWaiter) && (
              <Link href="/pos" className="group cursor-pointer focus:outline-none">
                <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="rounded-xl bg-secondary/10 p-3 text-secondary">
                        <Receipt className="h-7 w-7" />
                      </div>
                      <span className="rounded-full bg-secondary/10 px-4 py-1 text-xs font-black text-secondary uppercase tracking-widest">
                        Activo
                      </span>
                    </div>
                    <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-secondary transition-colors flex items-center justify-between">
                      <span>Punto de Venta</span>
                      <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </h3>
                    <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                      Crear órdenes y procesar pagos.
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Cocina */}
            <Link href="/kitchen" className="group cursor-pointer focus:outline-none">
              <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                      <ChefHat className="h-7 w-7" />
                    </div>
                    <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-black text-primary uppercase tracking-widest">
                      Real-time
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Sistema de Cocina</span>
                    <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </h3>
                  <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                    KDS con temporizador y smart batching.
                  </p>
                </div>
              </div>
            </Link>

            {/* Tareas Diarias */}
            {(isAdmin || isWaiter) && (
              <Link href="/tareas" className="group cursor-pointer focus:outline-none">
                <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="rounded-xl bg-primary/10 p-3 text-primary">
                        <CheckSquare className="h-7 w-7" />
                      </div>
                      <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-black text-primary uppercase tracking-widest">
                        Checklist
                      </span>
                    </div>
                    <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>Tareas Diarias</span>
                      <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </h3>
                    <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                      Checklist de tareas primordiales y operación diaria.
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Asistencia */}
            <Link href="/asistencia" className="group cursor-pointer focus:outline-none">
              <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="rounded-xl bg-purple-500/10 p-3 text-purple-500">
                      <Clock className="h-7 w-7" />
                    </div>
                    <span className="rounded-full bg-purple-500/10 px-4 py-1 text-xs font-black text-purple-500 uppercase tracking-widest">
                      Turnos
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-purple-500 transition-colors flex items-center justify-between">
                    <span>Asistencia</span>
                    <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </h3>
                  <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                    Registro de entradas y salidas.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* SECCIÓN 2: ADMINISTRACIÓN Y CLIENTES */}
        {(isAdmin || isWaiter) && (
          <section className="mb-10">
            <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success"></span>
                Gestión y Clientes
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Clientes */}
              <Link href="/customers" className="group cursor-pointer focus:outline-none">
                <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="rounded-xl bg-success/10 p-3 text-success">
                        <Users className="h-7 w-7" />
                      </div>
                      <span className="rounded-full bg-success/10 px-4 py-1 text-xs font-black text-success uppercase tracking-widest">
                        CRM
                      </span>
                    </div>
                    <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-success transition-colors flex items-center justify-between">
                      <span>Clientes</span>
                      <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </h3>
                    <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                      Lealtad y fuentes de visita.
                    </p>
                  </div>
                </div>
              </Link>

              {/* Menú - Admin */}
              {isAdmin && (
                <Link href="/menu" className="group cursor-pointer focus:outline-none">
                  <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                      <div className="mb-6 flex items-center justify-between">
                        <div className="rounded-xl bg-primary/10 p-3 text-primary">
                          <UtensilsCrossed className="h-7 w-7" />
                        </div>
                      </div>
                      <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>Gestión de Menú</span>
                        <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </h3>
                      <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                        Productos y recetas técnicas.
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {/* Historial de Asistencia - Admin */}
              {isAdmin && (
                <Link href="/asistencia/history" className="group cursor-pointer focus:outline-none">
                  <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                      <div className="mb-6 flex items-center justify-between">
                        <div className="rounded-xl bg-purple-500/10 p-3 text-purple-500">
                          <ReceiptText className="h-7 w-7" />
                        </div>
                        <span className="rounded-full bg-purple-500/10 px-4 py-1 text-xs font-black text-purple-500 uppercase tracking-widest">
                          Historial
                        </span>
                      </div>
                      <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-purple-500 transition-colors flex items-center justify-between">
                        <span>Historial de Asistencia</span>
                        <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </h3>
                      <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                        Filtros de horas trabajadas y registros de turno por empleado.
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {/* Control de Tareas - Admin */}
              {isAdmin && (
                <Link href="/admin/tareas" className="group cursor-pointer focus:outline-none">
                  <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                      <div className="mb-6 flex items-center justify-between">
                        <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
                          <ClipboardCheck className="h-7 w-7" />
                        </div>
                        <span className="rounded-full bg-blue-500/10 px-4 py-1 text-xs font-black text-blue-500 uppercase tracking-widest">
                          Control
                        </span>
                      </div>
                      <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-blue-500 transition-colors flex items-center justify-between">
                        <span>Control de Tareas</span>
                        <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </h3>
                      <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                        Aprobación de tareas críticas y monitoreo de tiempos netos.
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {/* Usuarios - Admin */}
              {isAdmin && (
                <Link href="/admin/users" className="group cursor-pointer focus:outline-none">
                  <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                      <div className="mb-6 flex items-center justify-between">
                        <div className="rounded-xl bg-primary/10 p-3 text-primary">
                          <UserCog className="h-7 w-7" />
                        </div>
                      </div>
                      <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>Usuarios</span>
                        <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </h3>
                      <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                        Gestión de personal y roles.
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* SECCIÓN 3: FINANZAS Y REPORTES - Admin Only */}
        {isAdmin && (
          <section className="mb-8">
            <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                Finanzas y Reportes
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Historial */}
              <Link href="/history" className="group cursor-pointer focus:outline-none">
                <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500">
                        <BookOpen className="h-7 w-7" />
                      </div>
                      <span className="rounded-full bg-blue-500/10 px-4 py-1 text-xs font-black text-blue-500 uppercase tracking-widest">
                        Registro
                      </span>
                    </div>
                    <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-blue-500 transition-colors flex items-center justify-between">
                      <span>Historial</span>
                      <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </h3>
                    <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                      Historial de órdenes y cobros.
                    </p>
                  </div>
                </div>
              </Link>

              {/* Gastos */}
              <Link href="/gastos" className="group cursor-pointer focus:outline-none">
                <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="rounded-xl bg-red-500/10 p-3 text-red-500">
                        <ReceiptText className="h-7 w-7" />
                      </div>
                      <span className="rounded-full bg-red-500/10 px-4 py-1 text-xs font-black text-red-500 uppercase tracking-widest">
                        NUEVO
                      </span>
                    </div>
                    <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-red-500 transition-colors flex items-center justify-between">
                      <span>Gastos</span>
                      <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </h3>
                    <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                      Registro y control de gastos (insumos, sueldos, etc.)
                    </p>
                  </div>
                </div>
              </Link>

              {/* Reportes */}
              <Link href="/reports" className="group cursor-pointer focus:outline-none">
                <div className="h-full rounded-2xl bg-[#242424] p-8 shadow-sm border border-white/5 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="rounded-xl bg-[#242424] p-3 text-[#E0E0E0]">
                        <BarChart3 className="h-7 w-7" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-xl font-black text-[#E0E0E0] tracking-tight uppercase group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>Reportes</span>
                      <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </h3>
                    <p className="text-sm text-[#E0E0E0]/60 font-medium leading-relaxed">
                      Ventas y métricas de negocio.
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

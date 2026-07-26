"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createUser, deleteUser, updateUserRole } from "./actions";
import {
  ArrowLeft,
  UserPlus,
  Users,
  ShieldCheck,
  Trash2,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertTriangle,
  ChefHat,
  Receipt,
  Info,
  Shield,
  Check,
  X,
} from "lucide-react";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

const ROLE_PERMISSIONS: Record<
  string,
  {
    title: string;
    subtitle: string;
    color: string;
    badgeBg: string;
    badgeBorder: string;
    permissions: string[];
    restrictions: string[];
  }
> = {
  ADMIN: {
    title: "Administrador (ADMIN)",
    subtitle: "Acceso total a todos los módulos y configuraciones del sistema",
    color: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/20",
    permissions: [
      "Acceso completo a todos los módulos",
      "Administración de usuarios y roles",
      "Reportes financieros y gráficos de ventas",
      "Cortes de caja y balance financiero",
      "Gestión de menú, precios y recetas técnicas",
      "Control de tareas y asistencia global",
    ],
    restrictions: [],
  },
  MANAGER: {
    title: "Gerente (MANAGER)",
    subtitle: "Gestión operativa, inventarios, tareas y cortes de caja",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/20",
    permissions: [
      "Gestión de ventas y órdenes",
      "Cortes de caja y arqueos",
      "Gestión de menú y productos",
      "Historial de asistencias de personal",
      "Checklist de tareas operativas",
    ],
    restrictions: ["No puede eliminar otros administradores"],
  },
  WAITER: {
    title: "Mesero (WAITER)",
    subtitle: "Punto de venta (POS), toma de pedidos y atención a clientes",
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/20",
    permissions: [
      "Punto de Venta (POS) y comandería",
      "Registro y consulta de clientes (CRM)",
      "Marcaje de entrada y salida propia",
      "Checklist de tareas asignadas",
    ],
    restrictions: [
      "Sin acceso a reportes financieros",
      "Sin acceso a edición de menú",
      "Sin acceso a administración de usuarios",
    ],
  },
  CHEF: {
    title: "Cocinero / Chef (CHEF)",
    subtitle: "Pantalla KDS de cocina, preparación de pedidos y tareas de cocina",
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/20",
    permissions: [
      "Display KDS de cocina (/kitchen)",
      "Vista por lotes (Smart Batching) de platillos",
      "Cambio de estado de órdenes en preparación",
      "Marcaje de asistencia propia",
    ],
    restrictions: [
      "Sin acceso a Punto de Venta (POS)",
      "Sin acceso a ventas ni clientes",
      "Sin acceso a configuración del sistema",
    ],
  },
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedFormRole, setSelectedFormRole] = useState<string>("WAITER");

  const [isPending, startTransition] = useTransition();

  // Load profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users/list");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      } else {
        setErrorMsg("Error al obtener usuarios.");
      }
    } catch (e) {
      setErrorMsg("Error desconocido.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const res = await createUser(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else if (res?.success) {
        setSuccessMsg("Usuario creado exitosamente.");
        form.reset();
        setSelectedFormRole("WAITER");
        fetchProfiles();
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    const res = await deleteUser(id);
    if (res?.error) {
      setErrorMsg(res.error);
    } else if (res?.success) {
      setSuccessMsg("Usuario eliminado.");
      fetchProfiles();
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    const res = await updateUserRole(id, newRole);
    if (res?.error) {
      setErrorMsg(res.error);
    } else if (res?.success) {
      setSuccessMsg("Rol actualizado correctamente.");
      fetchProfiles();
    }
  };

  // Stats calculation
  const totalAdmins = profiles.filter((p) => p.role === "ADMIN" || p.role === "MANAGER").length;
  const totalWaiters = profiles.filter((p) => p.role === "WAITER").length;
  const totalChefs = profiles.filter((p) => p.role === "CHEF").length;

  const currentRoleInfo = ROLE_PERMISSIONS[selectedFormRole] || ROLE_PERMISSIONS.WAITER;

  return (
    <div className="min-h-screen bg-[#121212] pb-16">
      {/* Top Header */}
      <header className="bg-[#242424] border-b border-white/5 shadow-sm mb-8">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-black text-[#E0E0E0]/60 hover:text-white uppercase tracking-widest transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-primary animate-pulse"></span>
                Gestión de Personal & Usuarios
              </h1>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">
                Control de Usuarios
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        {/* Messages */}
        {errorMsg && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-xs font-bold shadow-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400 text-xs font-bold shadow-sm">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Total Usuarios
              </span>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
              {profiles.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Administración
              </span>
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-blue-400 tracking-tight">
              {totalAdmins}
            </p>
          </div>

          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Meseros / Servicio
              </span>
              <div className="rounded-xl bg-secondary/10 p-3 text-secondary">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-secondary tracking-tight">
              {totalWaiters}
            </p>
          </div>

          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Cocina / KDS
              </span>
              <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
                <ChefHat className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-purple-400 tracking-tight">
              {totalChefs}
            </p>
          </div>
        </section>

        {/* Main Grid: New User Form & User List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* New User Form */}
          <div className="lg:col-span-1">
            <div className="bg-[#242424] rounded-2xl shadow-sm p-6 sm:p-8 border border-white/5 space-y-6">
              <h2 className="text-lg font-black text-[#E0E0E0] flex items-center gap-2 border-b border-white/5 pb-3 uppercase tracking-tight">
                <UserPlus className="h-5 w-5 text-primary" /> Nuevo Usuario
              </h2>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-[#E0E0E0]/60 uppercase tracking-wider mb-2">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-[#E0E0E0]/40" />
                    <input
                      type="text"
                      name="fullName"
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#181818] pl-10 pr-4 py-2.5 text-xs text-[#E0E0E0] placeholder-[#666666] focus:border-primary outline-none transition-all"
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#E0E0E0]/60 uppercase tracking-wider mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#E0E0E0]/40" />
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#181818] pl-10 pr-4 py-2.5 text-xs text-[#E0E0E0] placeholder-[#666666] focus:border-primary outline-none transition-all"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#E0E0E0]/60 uppercase tracking-wider mb-2">
                    Contraseña Temporal
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#E0E0E0]/40" />
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-white/10 bg-[#181818] pl-10 pr-4 py-2.5 text-xs text-[#E0E0E0] placeholder-[#666666] focus:border-primary outline-none transition-all"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#E0E0E0]/60 uppercase tracking-wider mb-2">
                    Rol del Empleado
                  </label>
                  <select
                    name="role"
                    required
                    value={selectedFormRole}
                    onChange={(e) => setSelectedFormRole(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-xs text-[#E0E0E0] focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="ADMIN">Administrador (ADMIN)</option>
                    <option value="MANAGER">Gerente (MANAGER)</option>
                    <option value="WAITER">Mesero (WAITER) - Sólo POS/Clientes</option>
                    <option value="CHEF">Cocinero (CHEF) - Sólo Cocina</option>
                  </select>
                </div>

                {/* Dynamic Role Permission Hint */}
                <div className={`p-4 rounded-xl border ${currentRoleInfo.badgeBg} ${currentRoleInfo.badgeBorder} space-y-2`}>
                  <div className="flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${currentRoleInfo.color}`} />
                    <span className={`text-xs font-black uppercase tracking-wider ${currentRoleInfo.color}`}>
                      {currentRoleInfo.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#E0E0E0]/70 font-medium">
                    {currentRoleInfo.subtitle}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-black text-white uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mt-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {isPending ? "Creando..." : "Crear Usuario"}
                </button>
              </form>
            </div>
          </div>

          {/* User List */}
          <div className="lg:col-span-2">
            <div className="bg-[#242424] rounded-2xl shadow-sm p-6 sm:p-8 border border-white/5">
              <h2 className="text-lg font-black text-[#E0E0E0] mb-6 flex items-center gap-2 border-b border-white/5 pb-3 uppercase tracking-tight">
                <Users className="h-5 w-5 text-secondary" /> Personal Registrado
              </h2>

              {isLoading ? (
                <p className="text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest py-8 text-center">
                  Cargando usuarios...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs font-black text-[#E0E0E0]/40 uppercase tracking-wider">
                        <th className="py-3 px-3">Nombre y Correo</th>
                        <th className="py-3 px-3">Rol Actual</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {profiles.map((profile) => {
                        const roleInfo = ROLE_PERMISSIONS[profile.role] || ROLE_PERMISSIONS.WAITER;
                        return (
                          <tr key={profile.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary border border-primary/20 flex-shrink-0">
                                  {(profile.full_name || profile.email).substring(0, 2).toUpperCase()}
                                </span>
                                <div>
                                  <p className="font-bold text-[#E0E0E0] uppercase text-sm">
                                    {profile.full_name || "Sin Nombre"}
                                  </p>
                                  <p className="text-xs text-[#E0E0E0]/40 font-mono">
                                    {profile.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="space-y-1">
                                <select
                                  className="bg-[#181818] border border-white/10 text-[#E0E0E0] text-xs font-bold uppercase rounded-xl px-3 py-1.5 focus:border-primary outline-none cursor-pointer"
                                  value={profile.role}
                                  onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                >
                                  <option value="ADMIN">ADMIN</option>
                                  <option value="MANAGER">MANAGER</option>
                                  <option value="WAITER">WAITER</option>
                                  <option value="CHEF">CHEF</option>
                                </select>
                                <p className="text-[10px] text-[#E0E0E0]/40 font-medium line-clamp-1 max-w-[200px]">
                                  {roleInfo.subtitle}
                                </p>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <button
                                onClick={() => handleDelete(profile.id, profile.full_name || profile.email)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer active:scale-95"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {profiles.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
                            No hay usuarios registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Permissions Reference Guide Section */}
        <section className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> Guía Descriptiva de Permisos por Rol
            </h2>
            <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-widest">
              Referencia de Sistema
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(ROLE_PERMISSIONS).map(([roleKey, info]) => (
              <div
                key={roleKey}
                className="rounded-xl bg-[#181818] p-5 border border-white/5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${info.badgeBg} ${info.color} ${info.badgeBorder}`}>
                      {roleKey}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-[#E0E0E0] uppercase tracking-tight mb-1">
                    {info.title.split("(")[0]}
                  </h3>
                  <p className="text-xs text-[#E0E0E0]/60 font-medium mb-4 leading-relaxed">
                    {info.subtitle}
                  </p>

                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <p className="text-[10px] font-black text-[#E0E0E0]/40 uppercase tracking-wider">
                      Permisos Incluidos:
                    </p>
                    <ul className="space-y-1.5 text-xs text-[#E0E0E0]/80">
                      {info.permissions.map((perm, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{perm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {info.restrictions.length > 0 && (
                    <div className="space-y-2 border-t border-white/5 pt-3 mt-3">
                      <p className="text-[10px] font-black text-red-400/60 uppercase tracking-wider">
                        Restricciones:
                      </p>
                      <ul className="space-y-1 text-xs text-red-300/80">
                        {info.restrictions.map((rest, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                            <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                            <span>{rest}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

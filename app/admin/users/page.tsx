"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createUser, deleteUser, updateUserRole } from "./actions";
import {
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
  Search,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import {
  TableSearchInput,
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";

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

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormRole, setSelectedFormRole] = useState<string>("WAITER");
  const [isPending, startTransition] = useTransition();

  // Table Filters, Sort & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  type SortField = "full_name" | "email" | "role" | "created_at";
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

    startTransition(async () => {
      const res = await createUser(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else if (res?.success) {
        setSuccessMsg("Usuario creado exitosamente.");
        setIsModalOpen(false);
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

  // Filtered & Sorted Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.full_name || "").toLowerCase().includes(q);
        const matchEmail = (p.email || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      if (roleFilter !== "ALL" && p.role !== roleFilter) return false;
      return true;
    });
  }, [profiles, searchQuery, roleFilter]);

  const sortedProfiles = useMemo(() => {
    return [...filteredProfiles].sort((a, b) => {
      let comp = 0;
      if (sortField === "full_name") {
        comp = (a.full_name || "").localeCompare(b.full_name || "");
      } else if (sortField === "email") {
        comp = (a.email || "").localeCompare(b.email || "");
      } else if (sortField === "role") {
        comp = (a.role || "").localeCompare(b.role || "");
      } else if (sortField === "created_at") {
        comp = (a.created_at || "").localeCompare(b.created_at || "");
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [filteredProfiles, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, sortField, sortDirection, pageSize]);

  const totalPages = Math.ceil(sortedProfiles.length / pageSize) || 1;
  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProfiles.slice(start, start + pageSize);
  }, [sortedProfiles, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] pb-16 text-[#E0E0E0]">
      {/* Header reutilizable */}
      <PageHeader
        title="Gestión de Personal & Usuarios"
        subtitle="Administra cuentas de acceso, asignación de roles y permisos"
        badgeColor="bg-blue-500"
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-black text-black hover:brightness-105 transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo Usuario
          </button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Mensajes de notificación */}
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

        {/* Tarjetas de Métricas Rápidas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Total Usuarios
              </p>
              <p className="mt-1 text-2xl font-black text-[#E0E0E0]">{profiles.length}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Administradores
              </p>
              <p className="mt-1 text-2xl font-black text-blue-400">{totalAdmins}</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Meseros / POS
              </p>
              <p className="mt-1 text-2xl font-black text-amber-400">{totalWaiters}</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Receipt className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Cocineros / KDS
              </p>
              <p className="mt-1 text-2xl font-black text-purple-400">{totalChefs}</p>
            </div>
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
              <ChefHat className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* TABLA DE USUARIOS CON BUSQUEDA, FILTROS, ORDENAMIENTO Y PAGINACION */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <h2 className="text-base font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Directorio de Usuarios ({filteredProfiles.length})
            </h2>
            <button
              onClick={fetchProfiles}
              className="text-xs text-[#E0E0E0]/60 hover:text-white flex items-center gap-1.5 font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar Lista
            </button>
          </div>

          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Buscar Usuario
              </label>
              <TableSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar por nombre o correo..."
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Filtrar por Rol
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-blue-500"
              >
                <option value="ALL">Todos los Roles</option>
                <option value="ADMIN">Administrador</option>
                <option value="MANAGER">Gerente</option>
                <option value="WAITER">Mesero</option>
                <option value="CHEF">Cocinero / Chef</option>
              </select>
            </div>
          </div>

          {/* Tabla de Usuarios */}
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#181818] text-xs uppercase tracking-wider text-[#E0E0E0]/60 border-b border-white/5">
                <tr>
                  <TableHeaderSortCell
                    field="full_name"
                    label="Usuario / Nombre"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHeaderSortCell
                    field="email"
                    label="Correo Electrónico"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHeaderSortCell
                    field="role"
                    label="Rol Asignado"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHeaderSortCell
                    field="created_at"
                    label="Fecha Registro"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedProfiles.map((p) => {
                  const roleConfig = ROLE_PERMISSIONS[p.role] || ROLE_PERMISSIONS.WAITER;
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                            {(p.full_name || p.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#E0E0E0]">{p.full_name || "Sin Nombre"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#E0E0E0]/70">
                        {p.email}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={p.role}
                          onChange={(e) => handleRoleChange(p.id, e.target.value)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${roleConfig.badgeBg} ${roleConfig.color} ${roleConfig.badgeBorder}`}
                        >
                          <option value="ADMIN" className="bg-[#1E1E1E] text-white">ADMIN</option>
                          <option value="MANAGER" className="bg-[#1E1E1E] text-white">MANAGER</option>
                          <option value="WAITER" className="bg-[#1E1E1E] text-white">WAITER</option>
                          <option value="CHEF" className="bg-[#1E1E1E] text-white">CHEF</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#E0E0E0]/50">
                        {new Date(p.created_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(p.id, p.full_name || p.email)}
                          className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedProfiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#E0E0E0]/40 italic">
                      {isLoading ? "Cargando usuarios..." : "No se encontraron usuarios."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedProfiles.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </section>
      </main>

      {/* MODAL CREAR USUARIO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Usuario"
        subtitle="Registra las credenciales de acceso para el personal"
        icon={<UserPlus className="h-5 w-5 text-blue-400" />}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
              <input
                type="text"
                name="full_name"
                required
                className="w-full rounded-xl border border-white/10 bg-[#181818] pl-10 pr-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-blue-500"
                placeholder="Ej. María García"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-xl border border-white/10 bg-[#181818] pl-10 pr-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-blue-500"
                placeholder="maria@eltesoritodejalisco.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Contraseña de Acceso *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-[#181818] pl-10 pr-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Rol Inicial Asignado
            </label>
            <select
              name="role"
              value={selectedFormRole}
              onChange={(e) => setSelectedFormRole(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm font-bold text-[#E0E0E0] outline-none focus:border-blue-500"
            >
              <option value="WAITER">Mesero (WAITER)</option>
              <option value="CHEF">Cocinero / Chef (CHEF)</option>
              <option value="MANAGER">Gerente (MANAGER)</option>
              <option value="ADMIN">Administrador (ADMIN)</option>
            </select>
          </div>

          {/* Resumen dinámico del rol seleccionado */}
          <div className={`p-4 rounded-xl border ${currentRoleInfo.badgeBg} ${currentRoleInfo.badgeBorder} space-y-2`}>
            <p className={`text-xs font-black uppercase ${currentRoleInfo.color}`}>
              {currentRoleInfo.title}
            </p>
            <p className="text-xs text-[#E0E0E0]/70 font-medium">
              {currentRoleInfo.subtitle}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-[#E0E0E0]/70 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-blue-500 px-5 py-2.5 text-xs font-black text-black hover:brightness-105 disabled:opacity-50"
            >
              {isPending ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import {
  createUser,
  deleteUser,
  updateUserPin,
  updateUserRole,
} from "@/app/admin/users/actions";
import { getTenantRoles } from "@/app/admin/users/roles-actions";
import { PageHeader } from "@/components/PageHeader";
import {
  TableHeaderSortCell,
  TablePagination,
  TableSearchInput,
} from "@/components/ui/DataTableControls";
import { Modal } from "@/components/ui/Modal";
import { type RoleData } from "@/lib/permissions";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AdminRolesTab } from "./AdminRolesTab";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_id?: string | null;
  created_at: string;
  pin?: string | null;
};

export const ROLE_PERMISSIONS: Record<
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
      "Sin acceso a historial general de órdenes",
      "Sin acceso a edición de menú",
      "Sin acceso a administración de usuarios",
    ],
  },
  CHEF: {
    title: "Cocinero / Chef (CHEF)",
    subtitle:
      "Pantalla KDS de cocina, preparación de pedidos y tareas de cocina",
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
  INVENTORY: {
    title: "Inventario / Almacén (INVENTORY)",
    subtitle: "Control de stock, registro de entradas, mermas y catálogo de insumos",
    color: "text-teal-400",
    badgeBg: "bg-teal-500/10",
    badgeBorder: "border-teal-500/20",
    permissions: [
      "Acceso completo al módulo de inventario (/inventario)",
      "Ajustes de existencias, entradas y mermas",
      "Recepción y despacho de alertas de stock",
      "Marcaje de asistencia de personal",
      "Checklist de tareas operativas",
    ],
    restrictions: [
      "Sin acceso a Punto de Venta (POS)",
      "Sin acceso a reportes financieros",
      "Sin acceso a administración de usuarios",
    ],
  },
};

export function getRoleBadgeConfig(
  role: string,
  customRoles: RoleData[] = [],
  roleId?: string | null,
) {
  if (roleId) {
    const custom = customRoles.find((r) => r.id === roleId);
    if (custom) {
      if (custom.is_system && custom.system_slug && ROLE_PERMISSIONS[custom.system_slug]) {
        return ROLE_PERMISSIONS[custom.system_slug];
      }
      return {
        title: `${custom.name} (Personalizado)`,
        subtitle: custom.description || "Rol personalizado del restaurante",
        color: "text-primary",
        badgeBg: "bg-primary/10",
        badgeBorder: "border-primary/20",
        permissions: Array.isArray(custom.permissions)
          ? (custom.permissions as string[]).includes("*")
            ? ["Acceso total"]
            : (custom.permissions as string[])
          : [],
        restrictions: [],
      };
    }
  }

  const upper = (role || "").toUpperCase();
  if (ROLE_PERMISSIONS[upper]) return ROLE_PERMISSIONS[upper];

  const custom = customRoles.find(
    (r) =>
      r.name.toLowerCase() === (role || "").toLowerCase() ||
      r.id === role ||
      r.system_slug === upper,
  );
  if (custom) {
    if (custom.is_system && custom.system_slug && ROLE_PERMISSIONS[custom.system_slug]) {
      return ROLE_PERMISSIONS[custom.system_slug];
    }
    return {
      title: `${custom.name} (Personalizado)`,
      subtitle: custom.description || "Rol personalizado del restaurante",
      color: "text-primary",
      badgeBg: "bg-primary/10",
      badgeBorder: "border-primary/20",
      permissions: Array.isArray(custom.permissions)
        ? (custom.permissions as string[]).includes("*")
          ? ["Acceso total"]
          : (custom.permissions as string[])
        : [],
      restrictions: [],
    };
  }
  return {
    title: role,
    subtitle: "Rol asignado",
    color: "text-text-light/70",
    badgeBg: "bg-white/5",
    badgeBorder: "border-white/10",
    permissions: [],
    restrictions: [],
  };
}

interface AdminUsersContentProps {
  initialProfiles: Profile[];
}

export function AdminUsersContent({ initialProfiles }: AdminUsersContentProps) {
  const [activeTab, setActiveTab] = useState<"team" | "roles">("team");
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [availableRoles, setAvailableRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormRole, setSelectedFormRole] = useState<string>("WAITER");
  const [isPending, startTransition] = useTransition();

  // Modal para editar PIN de usuario Admin / Manager
  const [editingPinUser, setEditingPinUser] = useState<Profile | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Table Filters, Sort & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  type SortField = "full_name" | "email" | "role" | "created_at";
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const [res, rolesRes] = await Promise.all([
        fetch("/api/admin/users/list"),
        getTenantRoles(),
      ]);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      } else {
        setErrorMsg("Error al obtener usuarios.");
      }
      if (rolesRes.data) {
        setAvailableRoles(rolesRes.data);
      }
    } catch {
      setErrorMsg("Error desconocido.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getTenantRoles().then((res) => {
      if (res.data) setAvailableRoles(res.data);
    });
  }, []);

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
    if (deleteArmedId !== id) {
      setDeleteArmedId(id);
      setTimeout(() => setDeleteArmedId(null), 3000);
      return;
    }
    setDeleteArmedId(null);
    setErrorMsg("");
    setSuccessMsg("");

    const res = await deleteUser(id);
    if (res?.error) {
      setErrorMsg(res.error);
    } else if (res?.success) {
      setSuccessMsg(`Usuario ${name} eliminado.`);
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

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPinUser) return;

    const trimmed = newPin.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      setPinError("El PIN debe contener entre 4 y 6 dígitos numéricos");
      return;
    }

    setIsUpdatingPin(true);
    setPinError(null);
    try {
      const res = await updateUserPin(editingPinUser.id, trimmed);
      if (res?.error) {
        setPinError(res.error);
      } else {
        setSuccessMsg(`PIN actualizado para ${editingPinUser.full_name || editingPinUser.email}`);
        setEditingPinUser(null);
        fetchProfiles();
      }
    } catch {
      setPinError("Error al guardar el PIN.");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // Stats calculation
  const totalAdmins = profiles.filter((p) => {
    if (p.role === "ADMIN" || p.role === "MANAGER") return true;
    const r = availableRoles.find((ar) => ar.id === p.role_id);
    return r?.system_slug === "ADMIN" || r?.system_slug === "MANAGER";
  }).length;

  const totalWaiters = profiles.filter((p) => {
    if (p.role === "WAITER") return true;
    const r = availableRoles.find((ar) => ar.id === p.role_id);
    return r?.system_slug === "WAITER";
  }).length;

  const totalChefs = profiles.filter((p) => {
    if (p.role === "CHEF") return true;
    const r = availableRoles.find((ar) => ar.id === p.role_id);
    return r?.system_slug === "CHEF";
  }).length;

  const totalInventory = profiles.filter((p) => {
    if (p.role === "INVENTORY") return true;
    const r = availableRoles.find((ar) => ar.id === p.role_id);
    return r?.system_slug === "INVENTORY";
  }).length;

  const currentRoleInfo = getRoleBadgeConfig(
    selectedFormRole,
    availableRoles,
    availableRoles.find((r) => r.id === selectedFormRole || r.name === selectedFormRole)?.id,
  );

  // Filtered & Sorted Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.full_name || "").toLowerCase().includes(q);
        const matchEmail = (p.email || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      if (roleFilter !== "ALL") {
        if (p.role_id && p.role_id === roleFilter) return true;
        if (p.role === roleFilter) return true;
        const matchedRole = availableRoles.find((r) => r.id === p.role_id);
        if (matchedRole) {
          if (matchedRole.id === roleFilter) return true;
          if (matchedRole.system_slug === roleFilter) return true;
          if (matchedRole.name.toLowerCase() === roleFilter.toLowerCase()) return true;
        }
        return false;
      }
      return true;
    });
  }, [profiles, searchQuery, roleFilter, availableRoles]);

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
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background pb-16 text-text-light">
      <PageHeader
        title="Gestión de Personal & Usuarios"
        subtitle="Administra cuentas de acceso, asignación de roles y permisos"
        badgeColor="bg-blue-500"
        actions={
          activeTab === "team" ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-black text-black hover:brightness-105 transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <UserPlus className="h-4 w-4" />
              Nuevo Usuario
            </button>
          ) : null
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "team"
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                : "text-text-light/60 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
          >
            <Users className="h-4 w-4" />
            <span>Equipo de Trabajo ({profiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "roles"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-text-light/60 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Roles y Permisos</span>
          </button>
        </div>

        {/* Tab 2: Roles y Permisos */}
        {activeTab === "roles" && <AdminRolesTab />}

        {/* Tab 1: Equipo de Trabajo */}
        {activeTab === "team" && (
          <div className="space-y-6">
            {/* Mensajes de notificación */}
            {errorMsg && (
              <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-xs font-bold shadow-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400 text-xs font-bold shadow-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TABLA DE USUARIOS */}
            <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-black text-text-light">
                    Colaboradores Activos
                  </h2>
                  <button
                    onClick={fetchProfiles}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg text-text-light/40 hover:text-text-light hover:bg-white/5 transition-all"
                    title="Actualizar lista"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <TableSearchInput
                    value={searchQuery}
                    onChange={(v) => {
                      setSearchQuery(v);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar por nombre o correo..."
                  />

                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-text-light outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Todos los roles</option>
                    <optgroup label="Roles del Sistema">
                      <option value="ADMIN">Administrador</option>
                      <option value="MANAGER">Gerente</option>
                      <option value="WAITER">Mesero</option>
                      <option value="CHEF">Cocinero</option>
                      <option value="INVENTORY">Inventario</option>
                    </optgroup>
                    {availableRoles.some((r) => !r.is_system) && (
                      <optgroup label="Roles Personalizados">
                        {availableRoles
                          .filter((r) => !r.is_system)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark/60 text-xs font-bold uppercase tracking-wider text-text-light/40 border-b border-border">
                    <tr>
                      <TableHeaderSortCell
                        label="Colaborador"
                        field="full_name"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <TableHeaderSortCell
                        label="Correo Electrónico"
                        field="email"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <TableHeaderSortCell
                        label="Rol Asignado"
                        field="role"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <TableHeaderSortCell
                        label="Fecha Registro"
                        field="created_at"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedProfiles.map((p) => {
                      const roleConfig = getRoleBadgeConfig(
                        p.role,
                        availableRoles,
                        p.role_id,
                      );
                      const currentSelectValue =
                        p.role_id ||
                        availableRoles.find(
                          (r) =>
                            r.system_slug === p.role ||
                            r.name.toLowerCase() === p.role.toLowerCase(),
                        )?.id ||
                        p.role;

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-white/2 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                                {(p.full_name || p.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-text-light">
                                  {p.full_name || "Sin Nombre"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-text-light/70">
                            {p.email}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={currentSelectValue}
                              onChange={(e) =>
                                handleRoleChange(p.id, e.target.value)
                              }
                              className={`rounded-xl border px-3 py-1.5 text-xs font-bold outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${roleConfig.badgeBg} ${roleConfig.color} ${roleConfig.badgeBorder}`}
                            >
                              {availableRoles.length > 0 ? (
                                <>
                                  <optgroup label="Roles del Sistema">
                                    {availableRoles
                                      .filter((r) => r.is_system)
                                      .map((r) => (
                                        <option
                                          key={r.id}
                                          value={r.id}
                                          className="bg-card text-text-light"
                                        >
                                          {r.name}
                                        </option>
                                      ))}
                                  </optgroup>
                                  {availableRoles.some((r) => !r.is_system) && (
                                    <optgroup label="Roles Personalizados">
                                      {availableRoles
                                        .filter((r) => !r.is_system)
                                        .map((r) => (
                                          <option
                                            key={r.id}
                                            value={r.id}
                                            className="bg-card text-text-light"
                                          >
                                            {r.name}
                                          </option>
                                        ))}
                                    </optgroup>
                                  )}
                                </>
                              ) : (
                                <>
                                  <option
                                    value="ADMIN"
                                    className="bg-card text-text-light"
                                  >
                                    Administrador
                                  </option>
                                  <option
                                    value="MANAGER"
                                    className="bg-card text-text-light"
                                  >
                                    Gerente
                                  </option>
                                  <option
                                    value="WAITER"
                                    className="bg-card text-text-light"
                                  >
                                    Mesero
                                  </option>
                                  <option
                                    value="CHEF"
                                    className="bg-card text-text-light"
                                  >
                                    Cocinero / Chef
                                  </option>
                                  <option
                                    value="INVENTORY"
                                    className="bg-card text-text-light"
                                  >
                                    Inventario / Almacén
                                  </option>
                                </>
                              )}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-xs text-text-light/50">
                            {new Date(p.created_at).toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(p.role === "ADMIN" || p.role === "MANAGER") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPinUser(p);
                                    setNewPin(p.pin || "1234");
                                    setPinError(null);
                                  }}
                                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-2 py-1.5 text-xs font-black flex items-center gap-1 transition-all"
                                  title="Configurar PIN de Autorización"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  <span className="font-mono">{p.pin || "1234"}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(p.id, p.full_name || p.email)
                                }
                                className={`rounded-lg border p-2 transition-all text-xs font-black ${deleteArmedId === p.id
                                  ? "bg-red-500/30 border-red-500/50 text-red-300 px-2"
                                  : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                  }`}
                                title={
                                  deleteArmedId === p.id
                                    ? "Confirmar eliminación"
                                    : "Eliminar Usuario"
                                }
                              >
                                {deleteArmedId === p.id ? (
                                  "¿Seguro?"
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedProfiles.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-xs text-text-light/40 italic"
                        >
                          No se encontraron usuarios.
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
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </section>
          </div>
        )}
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
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
              <input
                type="text"
                name="full_name"
                required
                className="w-full rounded-xl border border-border bg-dark/40 pl-10 pr-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500"
                placeholder="Ej. María García"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-xl border border-border bg-dark/40 pl-10 pr-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500"
                placeholder="maria@eltesoritodejalisco.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Contraseña de Acceso (Opcional)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
              <input
                type="password"
                name="password"
                minLength={6}
                className="w-full rounded-xl border border-border bg-dark/40 pl-10 pr-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500"
                placeholder="Mínimo 6 caracteres o vacío si usará Google"
              />
            </div>
            <p className="text-[11px] text-text-light/40 mt-1">
              Si iniciará sesión con Google, puedes dejar este campo vacío.
            </p>
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Rol Inicial Asignado
            </label>
            <select
              name="role"
              value={selectedFormRole}
              onChange={(e) => setSelectedFormRole(e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm font-bold text-text-light outline-none focus:border-blue-500"
            >
              <optgroup label="Roles del Sistema">
                <option value="WAITER">Mesero (WAITER)</option>
                <option value="CHEF">Cocinero / Chef (CHEF)</option>
                <option value="INVENTORY">Inventario / Almacén (INVENTORY)</option>
                <option value="MANAGER">Gerente (MANAGER)</option>
                <option value="ADMIN">Administrador (ADMIN)</option>
              </optgroup>
              {availableRoles.some((r) => !r.is_system) && (
                <optgroup label="Roles Personalizados">
                  {availableRoles
                    .filter((r) => !r.is_system)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
            <input
              type="hidden"
              name="role_id"
              value={availableRoles.find((r) => r.id === selectedFormRole)?.id || ""}
            />
          </div>

          {(selectedFormRole === "ADMIN" ||
            selectedFormRole === "MANAGER" ||
            availableRoles.find((r) => r.id === selectedFormRole)?.system_slug === "ADMIN" ||
            availableRoles.find((r) => r.id === selectedFormRole)?.system_slug === "MANAGER") && (
              <div>
                <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
                  PIN de Autorización (4 a 6 dígitos)
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                  <input
                    type="password"
                    inputMode="numeric"
                    name="pin"
                    defaultValue="1234"
                    maxLength={6}
                    className="w-full rounded-xl border border-border bg-dark/40 pl-10 pr-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500 font-mono"
                    placeholder="1234"
                  />
                </div>
                <p className="text-[11px] text-text-light/40 mt-1">
                  PIN individual para autorizar descuentos, cancelaciones y reaperturas a meseros.
                </p>
              </div>
            )}

          {/* Resumen dinámico del rol seleccionado */}
          <div
            className={`p-4 rounded-xl border ${currentRoleInfo.badgeBg} ${currentRoleInfo.badgeBorder} space-y-2`}
          >
            <p
              className={`text-xs font-black uppercase ${currentRoleInfo.color}`}
            >
              {currentRoleInfo.title}
            </p>
            <p className="text-xs text-text-light/70 font-medium">
              {currentRoleInfo.subtitle}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-light/70 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-blue-500 px-5 py-2.5 text-xs font-black text-black hover:brightness-105 transition-all uppercase tracking-wider disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDITAR PIN */}
      <Modal
        isOpen={Boolean(editingPinUser)}
        onClose={() => setEditingPinUser(null)}
        title={`PIN de Autorización - ${editingPinUser?.full_name || editingPinUser?.email}`}
        subtitle="Código numérico para autorizar acciones sensibles en comandas y cajas"
        icon={<ShieldCheck className="h-5 w-5 text-amber-400" />}
        maxWidth="md"
      >
        <form onSubmit={handleSavePin} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Nuevo PIN Numérico (4 a 6 dígitos)
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
              <input
                type="password"
                inputMode="numeric"
                required
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full rounded-xl border border-border bg-dark/40 pl-10 pr-4 py-2.5 text-sm text-text-light outline-none focus:border-amber-400 font-mono tracking-widest text-center text-lg"
                placeholder="••••"
                autoFocus
              />
            </div>
            {pinError && (
              <p className="text-xs text-red-400 font-bold mt-1.5">{pinError}</p>
            )}
            <p className="text-[11px] text-text-light/40 mt-2">
              Este PIN debe ser recordado por el colaborador para autorizaciones presenciales.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setEditingPinUser(null)}
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-light/70 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUpdatingPin}
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black text-black hover:brightness-105 transition-all uppercase tracking-wider disabled:opacity-50"
            >
              {isUpdatingPin ? "Guardando..." : "Guardar PIN"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

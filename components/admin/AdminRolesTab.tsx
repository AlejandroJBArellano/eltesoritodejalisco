"use client";

import React, { useState, useEffect } from "react";
import { type RoleData, ALL_PERMISSION_KEYS } from "@/lib/permissions";
import {
  getTenantRoles,
  deleteCustomRole,
} from "@/app/admin/users/roles-actions";
import { RoleEditorModal } from "./RoleEditorModal";

export function AdminRolesTab() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modales
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Modal de eliminación y reasignación
  const [roleToDelete, setRoleToDelete] = useState<RoleData | null>(null);
  const [reassignRoleId, setReassignRoleId] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await getTenantRoles();
      if (res.data) {
        setRoles(res.data);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch {
      setErrorMsg("Error al cargar roles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateNew = () => {
    setSelectedRole(null);
    setIsDuplicating(false);
    setIsEditorOpen(true);
  };

  const handleEdit = (role: RoleData) => {
    setSelectedRole(role);
    setIsDuplicating(false);
    setIsEditorOpen(true);
  };

  const handleDuplicate = (role: RoleData) => {
    setSelectedRole(role);
    setIsDuplicating(true);
    setIsEditorOpen(true);
  };

  const handleDeleteClick = (role: RoleData) => {
    setErrorMsg("");
    setSuccessMsg("");
    setRoleToDelete(role);
    // Sugerir el primer rol de sistema diferente como reasignación
    const defaultReassign = roles.find((r) => r.id !== role.id && r.is_system);
    setReassignRoleId(defaultReassign?.id || "");
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    setErrorMsg("");

    try {
      const res = await deleteCustomRole(
        roleToDelete.id,
        roleToDelete.user_count && roleToDelete.user_count > 0
          ? reassignRoleId
          : undefined,
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Rol '${roleToDelete.name}' eliminado correctamente.`);
        setRoleToDelete(null);
        fetchRoles();
      }
    } catch {
      setErrorMsg("Error al eliminar el rol.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const systemRoles = filteredRoles.filter((r) => r.is_system);
  const customRoles = filteredRoles.filter((r) => !r.is_system);

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-xl border border-border">
        <div>
          <h2 className="text-base font-black tracking-tight text-text-light">
            Roles y Permisos Operativos
          </h2>
          <p className="text-xs text-text-light/60 mt-0.5">
            Personaliza el acceso de cada puesto de trabajo a módulos de cocina,
            ventas, inventarios y reportes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-background rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Nuevo Rol</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center justify-between font-bold"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            className="text-red-400 hover:text-text-light cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center justify-between font-bold"
        >
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            className="text-emerald-400 hover:text-text-light cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar rol por nombre o descripción..."
          className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-light placeholder-text-light/40 focus:outline-none focus:border-primary transition-colors font-medium"
        />
        <svg
          className="w-4 h-4 text-text-light/40 absolute left-3.5 top-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-text-light/40 text-xs font-medium">
          Cargando roles y permisos...
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Roles Personalizados */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-light/70 flex items-center gap-2">
                <span>Roles Personalizados del Restaurante</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {customRoles.length}
                </span>
              </h3>
            </div>

            {customRoles.length === 0 ? (
              <div className="p-8 text-center bg-card/50 border border-dashed border-border rounded-xl">
                <p className="text-xs text-text-light/60 font-medium">
                  No hay roles personalizados creados aún.
                </p>
                <p className="text-[11px] text-text-light/40 mt-1">
                  Crea perfiles como &ldquo;Capitán de Meseros&rdquo;,
                  &ldquo;Barman&rdquo; o &ldquo;Cajero&rdquo; con permisos a la
                  medida.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="mt-4 px-3 py-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  + Crear primer rol personalizado
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customRoles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    onEdit={() => handleEdit(role)}
                    onDuplicate={() => handleDuplicate(role)}
                    onDelete={() => handleDeleteClick(role)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 2. Roles del Sistema */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-text-light/70 flex items-center gap-2">
                <span>Roles Predeterminados del Sistema</span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-text-light/60 text-[10px] font-bold">
                  {systemRoles.length}
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={() => handleEdit(role)}
                  onDuplicate={() => handleDuplicate(role)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Modal Editor */}
      <RoleEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        roleToEdit={selectedRole}
        isDuplicating={isDuplicating}
        onSaved={fetchRoles}
      />

      {/* Modal de confirmación de eliminación */}
      {roleToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-card border border-border w-full max-w-md rounded-xl p-6 shadow-2xl space-y-5 text-text-light">
            <div className="space-y-2">
              <h3 className="text-base font-black text-text-light">
                Eliminar Rol: {roleToDelete.name}
              </h3>
              <p className="text-xs text-text-light/70">
                ¿Estás seguro de que deseas eliminar este rol personalizado?
                Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Si tiene colaboradores asignados */}
            {roleToDelete.user_count && roleToDelete.user_count > 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs text-amber-300 font-medium">
                <p className="font-bold">
                  ⚠️ Hay {roleToDelete.user_count} colaborador(es) con este rol
                  asignado.
                </p>
                <p className="text-text-light/80">
                  Selecciona a qué rol deseas transferir estos colaboradores
                  antes de proceder:
                </p>
                <select
                  value={reassignRoleId}
                  onChange={(e) => setReassignRoleId(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-light focus:border-primary"
                >
                  {roles
                    .filter((r) => r.id !== roleToDelete.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.is_system ? "(Sistema)" : "(Personalizado)"}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-text-light/70 hover:text-text-light bg-white/5 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-black bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Eliminando..." : "Confirmar Eliminación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface RoleCardProps {
  role: RoleData;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}

function RoleCard({ role, onEdit, onDuplicate, onDelete }: RoleCardProps) {
  const permsCount = Array.isArray(role.permissions)
    ? (role.permissions as string[]).includes("*")
      ? ALL_PERMISSION_KEYS.length
      : role.permissions.length
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:border-text-light/20 transition-all group shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-text-light group-hover:text-primary transition-colors">
              {role.name}
            </h4>
            <div className="flex items-center gap-2">
              {role.is_system ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Sistema
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Personalizado
                </span>
              )}
              <span className="text-[11px] text-text-light/50 font-medium">
                {role.user_count || 0} usuario(s)
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-text-light/60 mt-3 line-clamp-2 min-h-8">
          {role.description || "Sin descripción proporcionada."}
        </p>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-text-light/50 font-bold">
          <span>{permsCount} permisos asignados</span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 py-1.5 px-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-text-light rounded-lg border border-border/80 transition-colors text-center cursor-pointer"
        >
          {role.is_system ? "Ver Permisos" : "Editar"}
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicar como nuevo rol"
          className="py-1.5 px-2.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-text-light/70 hover:text-text-light rounded-lg border border-border/80 transition-colors cursor-pointer"
        >
          Duplicar
        </button>
        {!role.is_system && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Eliminar rol"
            className="py-1.5 px-2.5 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

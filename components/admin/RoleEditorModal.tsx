"use client";

import React, { useState, useTransition } from "react";
import {
  PERMISSION_MODULES,
  ALL_PERMISSION_KEYS,
  type PermissionKey,
  type RoleData,
} from "@/lib/permissions";
import {
  createCustomRole,
  updateCustomRole,
  duplicateRole,
} from "@/app/admin/users/roles-actions";

interface RoleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: RoleData | null;
  isDuplicating?: boolean;
  onSaved: () => void;
}

function RoleEditorModalContent({
  onClose,
  roleToEdit,
  isDuplicating = false,
  onSaved,
}: Omit<RoleEditorModalProps, "isOpen">) {
  const [name, setName] = useState(() => {
    if (!roleToEdit) return "";
    return isDuplicating ? `${roleToEdit.name} (Copia)` : roleToEdit.name;
  });

  const [description, setDescription] = useState(() => {
    if (!roleToEdit) return "";
    if (isDuplicating) {
      return roleToEdit.description
        ? `Copia basada en ${roleToEdit.name}. ${roleToEdit.description}`
        : `Copia personalizada de ${roleToEdit.name}`;
    }
    return roleToEdit.description || "";
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    () => {
      if (roleToEdit) {
        const initialPerms = Array.isArray(roleToEdit.permissions)
          ? (roleToEdit.permissions as string[]).includes("*")
            ? ALL_PERMISSION_KEYS
            : (roleToEdit.permissions as string[])
          : [];
        return new Set(initialPerms);
      }
      return new Set(["pos.view", "pos.create_order"]);
    },
  );

  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const togglePermission = (key: PermissionKey) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleModuleAll = (moduleKeys: PermissionKey[]) => {
    const allSelected = moduleKeys.every((k) => selectedPermissions.has(k));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        moduleKeys.forEach((k) => next.delete(k));
      } else {
        moduleKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPermissions(new Set(ALL_PERMISSION_KEYS));
  };

  const deselectAll = () => {
    setSelectedPermissions(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("El nombre del rol es requerido.");
      return;
    }

    if (selectedPermissions.size === 0) {
      setErrorMsg("Debes seleccionar al menos un permiso para el rol.");
      return;
    }

    startTransition(async () => {
      const permsArray = Array.from(selectedPermissions) as PermissionKey[];

      let res;
      if (isDuplicating && roleToEdit) {
        res = await duplicateRole(roleToEdit.id, name.trim());
      } else if (roleToEdit && !isDuplicating) {
        res = await updateCustomRole(roleToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          permissions: permsArray,
        });
      } else {
        res = await createCustomRole({
          name: name.trim(),
          description: description.trim(),
          permissions: permsArray,
        });
      }

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onSaved();
        onClose();
      }
    });
  };

  const isEditingSystem = roleToEdit?.is_system && !isDuplicating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-card border border-border w-full max-w-3xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden text-text-light">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-dark/40">
          <div>
            <h2
              id="role-modal-title"
              className="text-lg font-black tracking-tight text-text-light"
            >
              {isDuplicating
                ? `Duplicar Rol: ${roleToEdit?.name}`
                : roleToEdit
                  ? `Editar Rol: ${roleToEdit.name}`
                  : "Crear Nuevo Rol Personalizado"}
            </h2>
            <p className="text-xs text-text-light/60 mt-0.5">
              {isEditingSystem
                ? "Este rol es predeterminado del sistema (solo lectura). Puedes duplicarlo para personalizarlo."
                : "Configura el nombre y la matriz de permisos para este perfil operativo."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-text-light/50 hover:text-text-light p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {errorMsg && (
              <div
                role="alert"
                className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2 font-bold"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Inputs generales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="role-name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-light/70 mb-1.5"
                >
                  Nombre del Rol <span className="text-primary">*</span>
                </label>
                <input
                  id="role-name-input"
                  type="text"
                  required
                  disabled={isEditingSystem}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Capitán de Meseros"
                  className="w-full bg-dark/40 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-light placeholder-text-light/30 focus:outline-none focus:border-primary transition-colors disabled:opacity-60 font-medium"
                />
              </div>

              <div>
                <label
                  htmlFor="role-desc-input"
                  className="block text-xs font-bold uppercase tracking-wider text-text-light/70 mb-1.5"
                >
                  Descripción (Opcional)
                </label>
                <input
                  id="role-desc-input"
                  type="text"
                  disabled={isEditingSystem}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ej. Autorizaciones de descuentos y supervisión de sala"
                  className="w-full bg-dark/40 border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-light placeholder-text-light/30 focus:outline-none focus:border-primary transition-colors disabled:opacity-60 font-medium"
                />
              </div>
            </div>

            {/* Matriz de Permisos Header */}
            <div className="pt-2 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-text-light">
                    Matriz de Permisos ({selectedPermissions.size}{" "}
                    seleccionados)
                  </h3>
                  <p className="text-xs text-text-light/50">
                    Define qué acciones y vistas operativas tiene permitidas
                    este rol.
                  </p>
                </div>
                {!isEditingSystem && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="px-2.5 py-1 text-xs font-bold bg-white/5 hover:bg-white/10 text-text-light rounded-lg border border-border transition-colors cursor-pointer"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="px-2.5 py-1 text-xs font-bold bg-white/5 hover:bg-white/10 text-text-light/70 rounded-lg border border-border transition-colors cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                )}
              </div>

              {/* Módulos de permisos */}
              <div className="space-y-4">
                {PERMISSION_MODULES.map((module) => {
                  const moduleKeys = module.permissions.map((p) => p.key);
                  const selectedInModule = moduleKeys.filter((k) =>
                    selectedPermissions.has(k),
                  ).length;
                  const isAllModuleSelected =
                    selectedInModule === moduleKeys.length;

                  return (
                    <div
                      key={module.id}
                      className="bg-dark/40 border border-border/80 rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-text-light">
                              {module.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-text-light/60 border border-white/5 font-mono">
                              {selectedInModule}/{moduleKeys.length}
                            </span>
                          </div>
                          <p className="text-xs text-text-light/40">
                            {module.description}
                          </p>
                        </div>
                        {!isEditingSystem && (
                          <button
                            type="button"
                            onClick={() => toggleModuleAll(moduleKeys)}
                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            {isAllModuleSelected
                              ? "Deseleccionar"
                              : "Seleccionar todo"}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {module.permissions.map((perm) => {
                          const isChecked = selectedPermissions.has(perm.key);
                          return (
                            <label
                              key={perm.key}
                              htmlFor={`perm-check-${perm.key}`}
                              className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? "bg-primary/10 border-primary/30 text-text-light"
                                  : "bg-card border-border/50 text-text-light/70 hover:bg-white/5"
                              } ${isEditingSystem ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                              <input
                                id={`perm-check-${perm.key}`}
                                type="checkbox"
                                disabled={isEditingSystem}
                                checked={isChecked}
                                onChange={() => togglePermission(perm.key)}
                                className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4 bg-dark/40 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="block text-xs font-bold leading-tight">
                                  {perm.label}
                                </span>
                                <span className="block text-[11px] text-text-light/50 leading-normal mt-0.5">
                                  {perm.description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-dark/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-light/70 hover:text-text-light bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              {isEditingSystem ? "Cerrar" : "Cancelar"}
            </button>

            {!isEditingSystem ? (
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-background rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Guardando...</span>
                  </>
                ) : isDuplicating ? (
                  "Crear Rol Duplicado"
                ) : roleToEdit ? (
                  "Actualizar Rol"
                ) : (
                  "Guardar Rol"
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // Iniciar duplicación directamente
                  setName(`${roleToEdit.name} (Copia)`);
                  onSaved();
                }}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-primary/20 text-primary hover:bg-primary/30 rounded-lg transition-colors cursor-pointer"
              >
                Duplicar como Rol Personalizado
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function RoleEditorModal({
  isOpen,
  onClose,
  roleToEdit,
  isDuplicating = false,
  onSaved,
}: RoleEditorModalProps) {
  if (!isOpen) return null;

  const modalKey = roleToEdit
    ? `${roleToEdit.id}-${isDuplicating ? "copy" : "edit"}`
    : "new-role";

  return (
    <RoleEditorModalContent
      key={modalKey}
      onClose={onClose}
      roleToEdit={roleToEdit}
      isDuplicating={isDuplicating}
      onSaved={onSaved}
    />
  );
}

"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { FolderPlus } from "lucide-react";
import { useOptionalAdminTareasContext } from "./AdminTareasContext";

export interface TaskCategoryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  newCategoryName?: string;
  onCategoryNameChange?: (name: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  isLoading?: boolean;
}

export function TaskCategoryModal(props: TaskCategoryModalProps) {
  const context = useOptionalAdminTareasContext();

  const isOpen = props.isOpen ?? context?.isCategoryModalOpen ?? false;
  const onClose = props.onClose ?? context?.closeCategoryModal ?? (() => {});
  const newCategoryName =
    props.newCategoryName ?? context?.newCategoryName ?? "";
  const onCategoryNameChange =
    props.onCategoryNameChange ?? context?.setNewCategoryName ?? (() => {});
  const onSubmit =
    props.onSubmit ?? context?.handleCreateCategory ?? ((e) => e.preventDefault());
  const isLoading =
    props.isLoading ?? (context?.loading === "cat");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Categoría"
      subtitle="Organiza las tareas en grupos de trabajo"
      icon={<FolderPlus className="h-5 w-5 text-purple-400" />}
      maxWidth="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
            Nombre de la Categoría *
          </label>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => onCategoryNameChange(e.target.value)}
            placeholder="Ej. Cocina, Barra, Limpieza"
            className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-400 font-bold"
            required
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-gray-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-purple-500 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-600 disabled:opacity-50 transition-all"
          >
            {isLoading ? "Guardando..." : "Crear Categoría"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

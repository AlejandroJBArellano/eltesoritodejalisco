"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { CheckSquare } from "lucide-react";
import type { TaskCategory, TaskFrequency } from "@/types";
import type { TaskFormData } from "./types";
import { useOptionalAdminTareasContext } from "./AdminTareasContext";

export interface PrimordialTaskModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEditing?: boolean;
  categories?: TaskCategory[];
  formData?: TaskFormData;
  onFormChange?: (updates: Partial<TaskFormData>) => void;
  onSubmit?: (e: React.FormEvent) => void;
  isLoading?: boolean;
}

const DEFAULT_FORM_DATA: TaskFormData = {
  name: "",
  categoryId: "",
  frequencyType: "DAILY",
  requiresPhoto: false,
  timeoutMinutes: 60,
};

export function PrimordialTaskModal(props: PrimordialTaskModalProps) {
  const context = useOptionalAdminTareasContext();

  const isOpen = props.isOpen ?? context?.isTaskModalOpen ?? false;
  const onClose = props.onClose ?? context?.closeTaskModal ?? (() => {});
  const isEditing =
    props.isEditing ?? Boolean(context?.editingTaskId);
  const categories = props.categories ?? context?.categories ?? [];
  const formData = props.formData ?? context?.taskFormData ?? DEFAULT_FORM_DATA;
  const onFormChange =
    props.onFormChange ?? context?.updateTaskFormData ?? (() => {});
  const onSubmit =
    props.onSubmit ??
    (isEditing ? context?.handleUpdateTask : context?.handleCreateTask) ??
    ((e) => e.preventDefault());
  const isLoading =
    props.isLoading ?? (context?.loading === "task");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Tarea" : "Nueva Tarea"}
      subtitle="Configura el checklist operativo del restaurante"
      icon={<CheckSquare className="h-5 w-5 text-primary" />}
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
            Nombre de la Tarea *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onFormChange({ name: e.target.value })}
            placeholder="Ej. Limpieza de Freidoras"
            className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-white outline-none focus:border-primary font-bold"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
              Categoría
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => onFormChange({ categoryId: e.target.value })}
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-primary"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
              Frecuencia
            </label>
            <select
              value={formData.frequencyType}
              onChange={(e) =>
                onFormChange({ frequencyType: e.target.value as TaskFrequency })
              }
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-primary"
            >
              <option value="DAILY">Diario</option>
              <option value="CONTINUOUS">Continuo</option>
              <option value="ROUTINE">Rutina</option>
              <option value="WEEKLY">Semanal</option>
              <option value="CLOSING">Cierre</option>
              <option value="VARIABLE">Variable</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-dark/40 border border-border">
          <label className="text-xs font-bold text-white flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requiresPhoto}
              onChange={(e) =>
                onFormChange({ requiresPhoto: e.target.checked })
              }
              className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
            />
            Requiere foto de evidencia
          </label>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400">Timeout:</span>
            <input
              type="number"
              value={formData.timeoutMinutes}
              onChange={(e) =>
                onFormChange({ timeoutMinutes: Number(e.target.value) })
              }
              className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-xs font-bold text-white text-center"
              min={1}
            />
            <span className="text-xs text-gray-500">min</span>
          </div>
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
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-black hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {isLoading
              ? "Guardando..."
              : isEditing
                ? "Actualizar Tarea"
                : "Guardar Tarea"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

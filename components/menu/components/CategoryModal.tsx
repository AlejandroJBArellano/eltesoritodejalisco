import { FormEvent } from "react";
import { Tag, Globe } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CategoryFormState } from "../types";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  categoryForm: CategoryFormState;
  categoryErrors: Record<string, string>;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onNameEnChange: (value: string) => void;
}

export function CategoryModal({
  isOpen,
  onClose,
  onSubmit,
  categoryForm,
  categoryErrors,
  isSubmitting,
  onNameChange,
  onNameEnChange,
}: CategoryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryForm.id ? "Editar Categoría" : "Nueva Categoría"}
      subtitle="Define el nombre y su traducción al inglés"
      icon={<Tag className="h-5 w-5 text-amber-400" />}
      maxWidth="sm"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
            Nombre de la Categoría (ES) *
          </label>
          <input
            type="text"
            value={categoryForm.name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light placeholder-[#666] outline-none focus:border-primary"
            placeholder="Ej. ANTOJITOS"
          />
          {categoryErrors.name && (
            <p className="mt-1 text-xs font-bold text-red-400">
              {categoryErrors.name}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs font-extrabold text-text-light/40 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-blue-400" />
            Nombre en Inglés (EN)
          </label>
          <input
            type="text"
            value={categoryForm.nameEn}
            onChange={(e) => onNameEnChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light placeholder-[#444] outline-none focus:border-blue-500"
            placeholder="e.g. Snacks"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-light/70 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-black hover:brightness-105 disabled:opacity-50"
          >
            {isSubmitting
              ? "Guardando..."
              : categoryForm.id
                ? "Actualizar"
                : "Crear Categoría"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

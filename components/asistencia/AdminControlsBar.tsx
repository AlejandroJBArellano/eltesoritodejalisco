"use client";

import { ShieldAlert } from "lucide-react";
import { useOptionalAsistenciaContext } from "./AsistenciaContext";

interface AdminControlsBarProps {
  customTime?: string;
  onCustomTimeChange?: (time: string) => void;
}

export function AdminControlsBar(props: AdminControlsBarProps) {
  const context = useOptionalAsistenciaContext();
  const customTime = props.customTime ?? context?.customTime ?? "09:00";
  const onCustomTimeChange =
    props.onCustomTimeChange ?? context?.setCustomTime ?? (() => {});

  return (
    <div className="rounded-2xl bg-card p-6 border border-border flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" /> Modo Administrador
        </h3>
        <p className="text-xs text-text-light/60 mt-1 font-medium">
          Puedes registrar entradas o salidas manuales usando una hora personalizada.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider">
          Hora a registrar:
        </label>
        <input
          type="time"
          value={customTime}
          onChange={(e) => onCustomTimeChange(e.target.value)}
          className="bg-dark/40 border border-border text-text-light px-3.5 py-2 rounded-xl text-xs outline-none focus:border-primary font-mono"
        />
      </div>
    </div>
  );
}

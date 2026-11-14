"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

type EditPolicy = "NEVER" | "WITH_PERMISSION" | "WITH_MANAGER_AUTH";

const POLICY_OPTIONS: { value: EditPolicy; label: string; hint: string }[] = [
  {
    value: "WITH_PERMISSION",
    label: "Con permiso de modificar comandas",
    hint: "Quien tenga el permiso “Modificar Comandas” puede cambiar la selección.",
  },
  {
    value: "WITH_MANAGER_AUTH",
    label: "Con PIN de gerencia",
    hint: "Meseros necesitan autorización con PIN; gerentes y administradores no.",
  },
  {
    value: "NEVER",
    label: "Nunca",
    hint: "Una vez enviado a cocina, la personalización ya no se puede editar.",
  },
];

function Toggle({
  name,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-dark/40 border border-border/50">
      <div className="space-y-1">
        <span className="text-sm font-bold text-text-light block">{label}</span>
        <span className="text-[11px] text-text-light/50 block">{hint}</span>
      </div>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-border transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          checked ? "bg-primary" : "bg-dark/40"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-text-light shadow transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/** Ajustes de personalización de platillos por restaurante. */
export function SettingsCustomizationSection() {
  const { initialTenant } = useSettingsContext();
  const [policy, setPolicy] = useState<EditPolicy>(
    (initialTenant.customization_edit_after_kitchen as EditPolicy) ||
      "WITH_PERMISSION",
  );
  const [reprint, setReprint] = useState(
    initialTenant.customization_edit_reprint !== false,
  );
  const [notifyKds, setNotifyKds] = useState(
    initialTenant.customization_edit_notify_kds !== false,
  );
  const [discountIncludesModifiers, setDiscountIncludesModifiers] = useState(
    initialTenant.discount_includes_modifiers !== false,
  );

  return (
    <div className="rounded-xl bg-card border border-border p-6 space-y-5 transition hover:border-text-light/20">
      <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
        <SlidersHorizontal className="h-4 w-4 text-primary" /> Platillos
        personalizables
      </h3>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold text-text-light/60 uppercase tracking-wider mb-1.5">
          Editar la selección después de enviar a cocina
        </legend>
        <input type="hidden" name="customizationEditAfterKitchen" value={policy} />
        <div className="grid gap-2">
          {POLICY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                policy === opt.value
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-dark/40 hover:border-text-light/20"
              }`}
            >
              <input
                type="radio"
                name="customizationEditAfterKitchenRadio"
                value={opt.value}
                checked={policy === opt.value}
                onChange={() => setPolicy(opt.value)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className="block text-sm font-bold text-text-light">
                  {opt.label}
                </span>
                <span className="block text-[11px] text-text-light/50">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Toggle
        name="customizationEditReprint"
        checked={reprint}
        onChange={setReprint}
        label="Reimprimir comanda al editar"
        hint="Abre la comanda de los platillos modificados para imprimirla."
      />
      <Toggle
        name="customizationEditNotifyKds"
        checked={notifyKds}
        onChange={setNotifyKds}
        label="Marcar como “Modificado” en cocina"
        hint="El platillo vuelve a pendiente en el KDS con una etiqueta visible."
      />
      <Toggle
        name="discountIncludesModifiers"
        checked={discountIncludesModifiers}
        onChange={setDiscountIncludesModifiers}
        label="Descuentos incluyen extras"
        hint="Si se desactiva, el descuento por artículo solo aplica al precio base."
      />
    </div>
  );
}

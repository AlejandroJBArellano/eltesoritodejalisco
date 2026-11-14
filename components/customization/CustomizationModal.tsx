"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import {
  applyOptionChange,
  canIncrementOption,
  computePriceRange,
  getActiveGroups,
  getDefaultSelections,
  getEffectiveOptionPrice,
  getGroupStatus,
  getOptionCap,
  getOptionQuantity,
  isOptionSelectable,
  isSingleChoice,
  normalizeSelections,
  priceSelection,
  resolveTier,
  toggleOption,
  validateSelection,
  type CustomizationGroup,
  type CustomizationOption,
  type MenuItemCustomization,
  type Selection,
} from "@/lib/customization";

export interface CustomizationModalProps {
  productName: string;
  basePrice: number;
  customization: MenuItemCustomization;
  initialSelections?: Selection[];
  /** Texto del botón principal ("Agregar", "Guardar cambios"). */
  confirmLabel?: string;
  /** Aviso opcional arriba del contenido (p. ej. modo prueba). */
  notice?: string;
  onConfirm: (selections: Selection[], unitPrice: number) => void;
  onCancel: () => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;

function groupRuleLabel(group: CustomizationGroup): string {
  const required = group.minSelect > 0;
  const parts: string[] = [required ? "Obligatorio" : "Opcional"];
  if (group.minSelect > 0 && group.maxSelect === group.minSelect) {
    parts.push(`Elige ${group.minSelect}`);
  } else {
    if (group.minSelect > 0) parts.push(`Mín. ${group.minSelect}`);
    if (group.maxSelect != null) parts.push(`Máx. ${group.maxSelect}`);
  }
  return parts.join(" · ");
}

function OptionPrice({ option }: { option: CustomizationOption }) {
  const price = getEffectiveOptionPrice(option);
  if (price <= 0) return null;
  return (
    <span className="text-[11px] font-mono font-bold text-primary tabular-nums">
      {option.priceSource === "LINKED_PRODUCT" ? money(price) : `+${money(price)}`}
    </span>
  );
}

function GroupSection({
  group,
  selections,
  onChange,
  headingId,
}: {
  group: CustomizationGroup;
  selections: Selection[];
  onChange: (next: Selection[]) => void;
  headingId: string;
}) {
  const status = getGroupStatus(group, selections);
  const single = isSingleChoice(group);
  const tier =
    group.pricingMode === "TIERED" && status.quantity > 0
      ? resolveTier(group, status.quantity)
      : null;

  return (
    <section aria-labelledby={headingId} className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            id={headingId}
            className="text-sm font-bold text-text-light leading-tight"
          >
            {group.name}
          </h4>
          <p
            className={`mt-0.5 text-[11px] font-semibold uppercase tracking-wider ${
              group.minSelect > 0 && !status.satisfied
                ? "text-amber-400"
                : "text-text-light/50"
            }`}
          >
            {groupRuleLabel(group)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {(group.maxSelect != null || group.minSelect > 0) && (
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-mono font-bold tabular-nums ${
                status.satisfied
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-border bg-dark/40 text-text-light/70"
              }`}
              aria-live="polite"
            >
              {status.quantity}/{group.maxSelect ?? group.minSelect}
            </span>
          )}
          {tier?.allowed && tier.tier && (
            <span className="text-[11px] font-mono font-bold text-primary tabular-nums">
              {status.quantity} pzas · {money(tier.price)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {group.options.map((option) => {
          const qty = getOptionQuantity(option.id, selections);
          const selectable = isOptionSelectable(option);
          const outOfStock = option.isOutOfStock === true;

          if (group.allowRepeat) {
            const canAdd = canIncrementOption(group, option, selections);
            const cap = getOptionCap(group);
            return (
              <div
                key={option.id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  qty > 0
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-dark/40"
                } ${!selectable ? "opacity-45" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold uppercase tracking-wider text-text-light">
                    {option.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <OptionPrice option={option} />
                    {outOfStock && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          selectable ? "text-amber-400" : "text-rose-400"
                        }`}
                      >
                        {selectable ? "Sin stock" : "Agotado"}
                      </span>
                    )}
                    {Number.isFinite(cap) && cap > 1 && (
                      <span className="text-[10px] text-text-light/40">
                        máx. {cap}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-dark/40 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      onChange(applyOptionChange(group, option, selections, -1))
                    }
                    disabled={qty === 0}
                    aria-label={`Quitar ${option.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-light transition-colors hover:bg-red-500/20 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center font-mono text-sm font-bold tabular-nums text-text-light">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(applyOptionChange(group, option, selections, 1))
                    }
                    disabled={!canAdd}
                    aria-label={`Agregar ${option.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-text-light transition-colors hover:bg-emerald-500/20 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          const checked = qty > 0;
          const blocked =
            !checked && !single && !canIncrementOption(group, option, selections);
          return (
            <button
              key={option.id}
              type="button"
              role={single ? "radio" : "checkbox"}
              aria-checked={checked}
              disabled={!selectable || blocked}
              onClick={() => onChange(toggleOption(group, option, selections))}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                checked
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-dark/40 hover:border-text-light/25"
              } ${!selectable ? "opacity-45" : blocked ? "opacity-60" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                    single ? "rounded-full" : "rounded-md"
                  } ${checked ? "border-primary bg-primary text-dark" : "border-border"}`}
                >
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="truncate text-xs font-bold uppercase tracking-wider text-text-light">
                  {option.name}
                </span>
                {outOfStock && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      selectable ? "text-amber-400" : "text-rose-400"
                    }`}
                  >
                    {selectable ? "Sin stock" : "Agotado"}
                  </span>
                )}
              </span>
              <OptionPrice option={option} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function CustomizationModal({
  productName,
  basePrice,
  customization,
  initialSelections,
  confirmLabel = "Agregar",
  notice,
  onConfirm,
  onCancel,
}: CustomizationModalProps) {
  const titleId = useId();
  const groups = useMemo(() => getActiveGroups(customization), [customization]);
  const [selections, setSelections] = useState<Selection[]>(() =>
    initialSelections && initialSelections.length > 0
      ? normalizeSelections(initialSelections)
      : getDefaultSelections(customization),
  );
  const isWizard = customization.layout === "WIZARD" && groups.length > 1;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const price = useMemo(
    () => priceSelection(basePrice, customization, selections),
    [basePrice, customization, selections],
  );
  const validation = useMemo(
    () => validateSelection(customization, selections),
    [customization, selections],
  );
  const firstError = validation.errors[0]?.message ?? null;
  // Mientras la selección no está completa el nivel aún no aplica y el total
  // sería engañoso ($0); se muestra el precio mínimo posible.
  const minPrice = useMemo(
    () => computePriceRange(basePrice, customization).min,
    [basePrice, customization],
  );
  const showFromPrice = !validation.valid && minPrice != null;

  const visibleGroups = isWizard ? [groups[step]] : groups;
  const currentStatus = isWizard
    ? getGroupStatus(groups[step], selections)
    : null;
  const isLastStep = !isWizard || step === groups.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4 no-print"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="truncate text-base font-bold tracking-tight text-text-light"
            >
              {productName}
            </h3>
            {basePrice > 0 && (
              <p className="text-xs text-text-light/50">
                Precio base{" "}
                <span className="font-mono font-bold tabular-nums text-text-light/80">
                  {money(basePrice)}
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-text-light/50 transition-colors hover:bg-dark/40 hover:text-text-light cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {notice && (
          <p className="border-b border-border bg-amber-500/10 px-5 py-2 text-[11px] font-semibold text-amber-300">
            {notice}
          </p>
        )}

        {isWizard && (
          <div className="flex items-center gap-2 px-5 pt-4" aria-hidden>
            {groups.map((g, i) => (
              <span
                key={g.id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step
                    ? "bg-primary"
                    : i === step
                      ? "bg-primary/60"
                      : "bg-dark/60"
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {isWizard && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-light/50">
              Paso {step + 1} de {groups.length}
            </p>
          )}
          {visibleGroups.map((group) => (
            <GroupSection
              key={group.id}
              group={group}
              selections={selections}
              onChange={setSelections}
              headingId={`${titleId}-${group.id}`}
            />
          ))}
        </div>

        <footer className="space-y-3 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-light/60">
              {showFromPrice ? "Desde" : "Total"}
            </span>
            <span className="font-mono text-lg font-black tabular-nums text-text-light">
              {money(showFromPrice ? (minPrice ?? price.unitPrice) : price.unitPrice)}
            </span>
          </div>
          {firstError && isLastStep && (
            <p className="text-[11px] font-semibold text-amber-400" role="status">
              {firstError}
            </p>
          )}
          {isWizard && currentStatus && !currentStatus.satisfied && !isLastStep && (
            <p className="text-[11px] font-semibold text-amber-400" role="status">
              {currentStatus.reason}
            </p>
          )}
          <div className="flex gap-3">
            {isWizard && step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-dark/40 py-3 text-xs font-bold uppercase tracking-wider text-text-light/70 transition-colors hover:text-text-light cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-lg bg-dark/40 py-3 text-xs font-bold uppercase tracking-wider text-text-light/70 transition-colors hover:text-text-light cursor-pointer"
              >
                Cancelar
              </button>
            )}
            {isLastStep ? (
              <button
                type="button"
                disabled={!validation.valid}
                onClick={() => onConfirm(normalizeSelections(selections), price.unitPrice)}
                className="w-full rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-wider text-dark shadow-xs transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                {confirmLabel}
              </button>
            ) : (
              <button
                type="button"
                disabled={!currentStatus?.satisfied}
                onClick={() => setStep((s) => s + 1)}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-wider text-dark transition-all hover:brightness-110 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

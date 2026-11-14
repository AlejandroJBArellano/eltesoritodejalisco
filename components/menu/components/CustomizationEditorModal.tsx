"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Loader2,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  cloneCustomization,
  computePriceRange,
  createEmptyGroup,
  createEmptyOption,
  emptyCustomization,
  hasBlockingIssues,
  moveItem,
  resequence,
  toSavePayload,
  validateCustomizationConfig,
  type ConfigIssue,
  type CustomizationGroup,
  type CustomizationOption,
  type MenuItemCustomization,
  type TierMatchMode,
} from "@/lib/customization";
import { CustomizationModal } from "@/components/customization/CustomizationModal";
import type { Ingredient } from "../types";

export interface EditorMenuItem {
  id: string;
  name: string;
  price: number;
}

interface CustomizationEditorModalProps {
  menuItem: EditorMenuItem;
  /** Productos del tenant (para enlazar opciones y copiar configuraciones). */
  menuItems: EditorMenuItem[];
  ingredients: Ingredient[];
  onClose: () => void;
  onSaved?: () => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const inputClass =
  "w-full rounded-lg border border-border bg-dark/40 px-3 py-2 text-sm text-text-light outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50";
const labelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-light/60";

function parseIntOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

function parseMoney(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : 0;
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-text-light/80">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border border-border transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none ${
          checked ? "bg-primary" : "bg-dark/60"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-text-light shadow transition ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}

function IconButton({
  onClick,
  label,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-md border p-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          : "border-border bg-dark/40 text-text-light/70 hover:text-text-light"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Opción
// ---------------------------------------------------------------------------

function OptionEditor({
  option,
  index,
  total,
  menuItemId,
  menuItems,
  ingredients,
  onChange,
  onMove,
  onRemove,
  issues,
}: {
  option: CustomizationOption;
  index: number;
  total: number;
  menuItemId: string;
  menuItems: EditorMenuItem[];
  ingredients: Ingredient[];
  onChange: (next: CustomizationOption) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  issues: ConfigIssue[];
}) {
  const fieldId = useId();
  const linked = menuItems.find((m) => m.id === option.linkedMenuItemId);
  const inventoryMode: "none" | "linked" | "recipe" = option.linkedMenuItemId
    ? "linked"
    : option.recipe.length > 0
      ? "recipe"
      : "none";
  const hasError = issues.some((i) => i.level === "error");

  return (
    <div
      className={`space-y-3 rounded-lg border p-3 ${
        hasError ? "border-red-500/40 bg-red-500/5" : "border-border bg-dark/30"
      } ${option.isActive ? "" : "opacity-70"}`}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <label htmlFor={`${fieldId}-name`} className={labelClass}>
            Opción #{index + 1}
          </label>
          <input
            id={`${fieldId}-name`}
            className={inputClass}
            value={option.name}
            maxLength={80}
            placeholder="Ej. Pastor"
            onChange={(e) => onChange({ ...option, name: e.target.value })}
          />
        </div>
        <div className="w-36">
          <label htmlFor={`${fieldId}-price-source`} className={labelClass}>
            Precio
          </label>
          <select
            id={`${fieldId}-price-source`}
            className={inputClass}
            value={option.priceSource}
            disabled={!option.linkedMenuItemId}
            onChange={(e) =>
              onChange({
                ...option,
                priceSource: e.target.value as CustomizationOption["priceSource"],
              })
            }
          >
            <option value="CUSTOM">Precio extra</option>
            <option value="LINKED_PRODUCT">Del producto enlazado</option>
          </select>
        </div>
        <div className="w-28">
          <label htmlFor={`${fieldId}-delta`} className={labelClass}>
            {option.priceSource === "LINKED_PRODUCT" ? "Precio" : "+ Extra"}
          </label>
          {option.priceSource === "LINKED_PRODUCT" && option.linkedMenuItemId ? (
            <p className="rounded-lg border border-border bg-dark/20 px-3 py-2 font-mono text-sm tabular-nums text-text-light/70">
              {money(linked?.price ?? 0)}
            </p>
          ) : (
            <input
              id={`${fieldId}-delta`}
              type="number"
              min="0"
              step="0.5"
              className={`${inputClass} font-mono tabular-nums`}
              value={option.priceDelta}
              onChange={(e) =>
                onChange({ ...option, priceDelta: parseMoney(e.target.value) })
              }
            />
          )}
        </div>
        <div className="flex items-center gap-1 pb-1">
          <IconButton label="Subir opción" onClick={() => onMove(-1)} disabled={index === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label="Bajar opción"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Eliminar opción" onClick={onRemove} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${fieldId}-inventory`} className={labelClass}>
            Inventario
          </label>
          <select
            id={`${fieldId}-inventory`}
            className={inputClass}
            value={inventoryMode}
            onChange={(e) => {
              const mode = e.target.value as typeof inventoryMode;
              if (mode === "none") {
                onChange({
                  ...option,
                  linkedMenuItemId: null,
                  priceSource: "CUSTOM",
                  recipe: [],
                });
              } else if (mode === "linked") {
                const first = menuItems.find((m) => m.id !== menuItemId);
                onChange({
                  ...option,
                  linkedMenuItemId: option.linkedMenuItemId ?? first?.id ?? null,
                  recipe: [],
                });
              } else {
                onChange({
                  ...option,
                  linkedMenuItemId: null,
                  priceSource: "CUSTOM",
                  recipe:
                    option.recipe.length > 0
                      ? option.recipe
                      : [{ ingredientId: ingredients[0]?.id ?? "", quantityRequired: 1 }],
                });
              }
            }}
          >
            <option value="none">Sin inventario</option>
            <option value="linked">Producto existente (enlazar)</option>
            <option value="recipe">Receta propia</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${fieldId}-oos`} className={labelClass}>
            Si se agota
          </label>
          <select
            id={`${fieldId}-oos`}
            className={inputClass}
            value={option.outOfStockBehavior}
            onChange={(e) =>
              onChange({
                ...option,
                outOfStockBehavior: e.target
                  .value as CustomizationOption["outOfStockBehavior"],
              })
            }
          >
            <option value="DISABLE">Deshabilitar (aparece “Agotado”)</option>
            <option value="ALLOW">Permitir venderla</option>
          </select>
        </div>
      </div>

      {inventoryMode === "linked" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-linked`} className={labelClass}>
              Producto enlazado
            </label>
            <select
              id={`${fieldId}-linked`}
              className={inputClass}
              value={option.linkedMenuItemId ?? ""}
              onChange={(e) =>
                onChange({ ...option, linkedMenuItemId: e.target.value || null })
              }
            >
              {menuItems
                .filter((m) => m.id !== menuItemId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {money(m.price)}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <Switch
              checked={option.deductLinkedInventory}
              onChange={(v) => onChange({ ...option, deductLinkedInventory: v })}
              label="Descontar su receta / pieza por unidad"
            />
          </div>
        </div>
      )}

      {inventoryMode === "recipe" && (
        <div className="space-y-2">
          {option.recipe.map((row, ri) => (
            <div key={ri} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor={`${fieldId}-ing-${ri}`} className={labelClass}>
                  Ingrediente
                </label>
                <select
                  id={`${fieldId}-ing-${ri}`}
                  className={inputClass}
                  value={row.ingredientId}
                  onChange={(e) => {
                    const recipe = option.recipe.slice();
                    recipe[ri] = { ...row, ingredientId: e.target.value };
                    onChange({ ...option, recipe });
                  }}
                >
                  <option value="">Elegir…</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label htmlFor={`${fieldId}-qty-${ri}`} className={labelClass}>
                  Cantidad
                </label>
                <input
                  id={`${fieldId}-qty-${ri}`}
                  type="number"
                  min="0"
                  step="0.001"
                  className={`${inputClass} font-mono tabular-nums`}
                  value={row.quantityRequired}
                  onChange={(e) => {
                    const recipe = option.recipe.slice();
                    recipe[ri] = {
                      ...row,
                      quantityRequired: Math.max(0, Number(e.target.value) || 0),
                    };
                    onChange({ ...option, recipe });
                  }}
                />
              </div>
              <div className="pb-1">
                <IconButton
                  label="Quitar ingrediente"
                  danger
                  onClick={() =>
                    onChange({
                      ...option,
                      recipe: option.recipe.filter((_, i) => i !== ri),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...option,
                recipe: [...option.recipe, { ingredientId: "", quantityRequired: 1 }],
              })
            }
            className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
          >
            + Ingrediente
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Switch
          checked={option.isActive}
          onChange={(v) => onChange({ ...option, isActive: v })}
          label="Activa"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grupo
// ---------------------------------------------------------------------------

function GroupEditor({
  group,
  index,
  total,
  expanded,
  onToggle,
  menuItemId,
  menuItems,
  ingredients,
  onChange,
  onMove,
  onRemove,
  issues,
}: {
  group: CustomizationGroup;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  menuItemId: string;
  menuItems: EditorMenuItem[];
  ingredients: Ingredient[];
  onChange: (next: CustomizationGroup) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  issues: ConfigIssue[];
}) {
  const fieldId = useId();
  const groupIssues = issues.filter((i) => i.optionIndex == null);
  const errorCount = issues.filter((i) => i.level === "error").length;

  const updateOption = (oi: number, next: CustomizationOption) => {
    const options = group.options.slice();
    options[oi] = next;
    onChange({ ...group, options });
  };

  const setTierMode = (mode: TierMatchMode) => {
    onChange({
      ...group,
      tierMatchMode: mode,
      tiers: group.tiers.map((t) => ({
        ...t,
        quantityTo: mode === "RANGE" ? (t.quantityTo ?? t.quantityFrom) : null,
      })),
    });
  };

  return (
    <section
      className={`rounded-xl border ${
        errorCount > 0 ? "border-red-500/40" : "border-border"
      } bg-card`}
      aria-labelledby={`${fieldId}-title`}
    >
      <header className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-text-light/60" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-text-light/60" />
          )}
          <span
            id={`${fieldId}-title`}
            className="truncate text-sm font-bold text-text-light"
          >
            {group.name.trim() || `Grupo #${index + 1}`}
          </span>
          <span className="shrink-0 text-[11px] text-text-light/50">
            {group.options.length} opción(es)
            {group.pricingMode === "TIERED" ? " · por cantidad" : ""}
            {!group.isActive ? " · inactivo" : ""}
          </span>
          {errorCount > 0 && (
            <span className="shrink-0 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
              {errorCount} error(es)
            </span>
          )}
        </button>
        <IconButton label="Subir grupo" onClick={() => onMove(-1)} disabled={index === 0}>
          <ChevronUp className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          label="Bajar grupo"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Eliminar grupo" onClick={onRemove} danger>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </header>

      {expanded && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor={`${fieldId}-name`} className={labelClass}>
                Nombre del grupo
              </label>
              <input
                id={`${fieldId}-name`}
                className={inputClass}
                value={group.name}
                maxLength={80}
                placeholder="Ej. Elige tus tacos"
                onChange={(e) => onChange({ ...group, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor={`${fieldId}-min`} className={labelClass}>
                Mínimo
              </label>
              <input
                id={`${fieldId}-min`}
                type="number"
                min="0"
                className={`${inputClass} font-mono tabular-nums`}
                value={group.minSelect}
                onChange={(e) =>
                  onChange({ ...group, minSelect: parseIntOrNull(e.target.value) ?? 0 })
                }
              />
            </div>
            <div>
              <label htmlFor={`${fieldId}-max`} className={labelClass}>
                Máximo
              </label>
              <input
                id={`${fieldId}-max`}
                type="number"
                min="1"
                placeholder="Sin límite"
                className={`${inputClass} font-mono tabular-nums`}
                value={group.maxSelect ?? ""}
                onChange={(e) => {
                  const v = parseIntOrNull(e.target.value);
                  onChange({ ...group, maxSelect: v === 0 ? null : v });
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Switch
              checked={group.allowRepeat}
              onChange={(v) =>
                onChange({ ...group, allowRepeat: v, maxPerOption: v ? group.maxPerOption : null })
              }
              label="Permitir repetir opciones (contador)"
            />
            {group.allowRepeat && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`${fieldId}-max-per`}
                  className="text-xs font-semibold text-text-light/80"
                >
                  Máx. por opción
                </label>
                <input
                  id={`${fieldId}-max-per`}
                  type="number"
                  min="1"
                  placeholder="—"
                  className={`${inputClass} w-20 font-mono tabular-nums`}
                  value={group.maxPerOption ?? ""}
                  onChange={(e) => {
                    const v = parseIntOrNull(e.target.value);
                    onChange({ ...group, maxPerOption: v === 0 ? null : v });
                  }}
                />
              </div>
            )}
            <Switch
              checked={group.isActive}
              onChange={(v) => onChange({ ...group, isActive: v })}
              label="Grupo activo"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${fieldId}-pricing`} className={labelClass}>
                Cobro del grupo
              </label>
              <select
                id={`${fieldId}-pricing`}
                className={inputClass}
                value={group.pricingMode}
                onChange={(e) => {
                  const mode = e.target.value as CustomizationGroup["pricingMode"];
                  onChange({
                    ...group,
                    pricingMode: mode,
                    tierMatchMode:
                      mode === "TIERED" ? (group.tierMatchMode ?? "EXACT") : null,
                    tiers:
                      mode === "TIERED" && group.tiers.length === 0
                        ? [
                            {
                              quantityFrom: Math.max(1, group.minSelect),
                              quantityTo: null,
                              price: 0,
                            },
                          ]
                        : group.tiers,
                  });
                }}
              >
                <option value="ADDITIVE">Suma de opciones</option>
                <option value="TIERED">Por cantidad de piezas (niveles)</option>
              </select>
            </div>
            {group.pricingMode === "TIERED" && (
              <div>
                <label htmlFor={`${fieldId}-tier-mode`} className={labelClass}>
                  Cantidades entre niveles
                </label>
                <select
                  id={`${fieldId}-tier-mode`}
                  className={inputClass}
                  value={group.tierMatchMode ?? "EXACT"}
                  onChange={(e) => setTierMode(e.target.value as TierMatchMode)}
                >
                  <option value="EXACT">Solo cantidades exactas</option>
                  <option value="ROUND_UP">Cobrar el nivel siguiente</option>
                  <option value="RANGE">Rangos (desde–hasta)</option>
                </select>
              </div>
            )}
          </div>

          {group.pricingMode === "TIERED" && (
            <div className="space-y-2 rounded-lg border border-border bg-dark/30 p-3">
              <p className="text-[11px] text-text-light/50">
                El precio del nivel se suma al precio base del producto; los extras
                de cada opción se suman encima.
              </p>
              {group.tiers.map((tier, ti) => (
                <div key={ti} className="flex items-end gap-2">
                  <div className="w-24">
                    <label htmlFor={`${fieldId}-tf-${ti}`} className={labelClass}>
                      {group.tierMatchMode === "RANGE" ? "Desde" : "Piezas"}
                    </label>
                    <input
                      id={`${fieldId}-tf-${ti}`}
                      type="number"
                      min="1"
                      className={`${inputClass} font-mono tabular-nums`}
                      value={tier.quantityFrom}
                      onChange={(e) => {
                        const tiers = group.tiers.slice();
                        tiers[ti] = {
                          ...tier,
                          quantityFrom: Math.max(1, parseIntOrNull(e.target.value) ?? 1),
                        };
                        onChange({ ...group, tiers });
                      }}
                    />
                  </div>
                  {group.tierMatchMode === "RANGE" && (
                    <div className="w-24">
                      <label htmlFor={`${fieldId}-tt-${ti}`} className={labelClass}>
                        Hasta
                      </label>
                      <input
                        id={`${fieldId}-tt-${ti}`}
                        type="number"
                        min="1"
                        placeholder="∞"
                        className={`${inputClass} font-mono tabular-nums`}
                        value={tier.quantityTo ?? ""}
                        onChange={(e) => {
                          const tiers = group.tiers.slice();
                          const v = parseIntOrNull(e.target.value);
                          tiers[ti] = { ...tier, quantityTo: v === 0 ? null : v };
                          onChange({ ...group, tiers });
                        }}
                      />
                    </div>
                  )}
                  <div className="w-32">
                    <label htmlFor={`${fieldId}-tp-${ti}`} className={labelClass}>
                      Precio
                    </label>
                    <input
                      id={`${fieldId}-tp-${ti}`}
                      type="number"
                      min="0"
                      step="0.5"
                      className={`${inputClass} font-mono tabular-nums`}
                      value={tier.price}
                      onChange={(e) => {
                        const tiers = group.tiers.slice();
                        tiers[ti] = { ...tier, price: parseMoney(e.target.value) };
                        onChange({ ...group, tiers });
                      }}
                    />
                  </div>
                  <div className="pb-1">
                    <IconButton
                      label="Quitar nivel"
                      danger
                      onClick={() =>
                        onChange({
                          ...group,
                          tiers: group.tiers.filter((_, i) => i !== ti),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const last = group.tiers[group.tiers.length - 1];
                  const from = last ? (last.quantityTo ?? last.quantityFrom) + 1 : 1;
                  onChange({
                    ...group,
                    tiers: [
                      ...group.tiers,
                      {
                        quantityFrom: from,
                        quantityTo: group.tierMatchMode === "RANGE" ? from : null,
                        price: last?.price ?? 0,
                      },
                    ],
                  });
                }}
                className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
              >
                + Nivel
              </button>
            </div>
          )}

          {groupIssues.length > 0 && (
            <ul className="space-y-1">
              {groupIssues.map((issue, ii) => (
                <li
                  key={ii}
                  className={`text-[11px] font-semibold ${
                    issue.level === "error" ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-text-light/50">
              Opciones
            </h5>
            {group.options.map((option, oi) => (
              <OptionEditor
                key={option.id}
                option={option}
                index={oi}
                total={group.options.length}
                menuItemId={menuItemId}
                menuItems={menuItems}
                ingredients={ingredients}
                onChange={(next) => updateOption(oi, next)}
                onMove={(delta) =>
                  onChange({ ...group, options: moveItem(group.options, oi, delta) })
                }
                onRemove={() =>
                  onChange({
                    ...group,
                    options: resequence(group.options.filter((_, i) => i !== oi)),
                  })
                }
                issues={issues.filter((i) => i.optionIndex === oi)}
              />
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...group,
                  options: [...group.options, createEmptyOption(group.options.length)],
                })
              }
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-bold uppercase tracking-wider text-text-light/60 transition hover:border-primary/50 hover:text-primary cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Opción
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function CustomizationEditorModal({
  menuItem,
  menuItems,
  ingredients,
  onClose,
  onSaved,
}: CustomizationEditorModalProps) {
  const titleId = useId();
  const [config, setConfig] = useState<MenuItemCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<ConfigIssue[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState("");
  const [copying, setCopying] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/menu/${menuItem.id}/customization`);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "No se pudo cargar");
        if (cancelled) return;
        const loaded: MenuItemCustomization = data.customization ?? emptyCustomization();
        setConfig(loaded);
        setExpanded(new Set(loaded.groups.length === 1 ? [loaded.groups[0].id] : []));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar");
          setConfig(emptyCustomization());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [menuItem.id]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Descartarlos?")) return;
    onClose();
  }, [dirty, onClose, saving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !previewOpen) requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen, requestClose]);

  const update = (next: MenuItemCustomization) => {
    setConfig(next);
    setDirty(true);
    setServerIssues([]);
  };

  // Precios actuales de productos enlazados (para vista previa y rango)
  const priceById = useMemo(
    () => new Map(menuItems.map((m) => [m.id, m.price])),
    [menuItems],
  );
  const previewConfig = useMemo<MenuItemCustomization | null>(() => {
    if (!config) return null;
    return {
      ...config,
      groups: config.groups.map((g) => ({
        ...g,
        options: g.options.map((o) => ({
          ...o,
          linkedMenuItemPrice: o.linkedMenuItemId
            ? (priceById.get(o.linkedMenuItemId) ?? 0)
            : null,
        })),
      })),
    };
  }, [config, priceById]);

  const issues = useMemo(
    () => (previewConfig ? validateCustomizationConfig(previewConfig, menuItem.id) : []),
    [previewConfig, menuItem.id],
  );
  const blocking = hasBlockingIssues(issues);
  const range = useMemo(
    () => (previewConfig ? computePriceRange(menuItem.price, previewConfig) : null),
    [previewConfig, menuItem.price],
  );
  const hasActiveGroups =
    !!previewConfig &&
    previewConfig.groups.some((g) => g.isActive && g.options.some((o) => o.isActive));

  const handleSave = async () => {
    if (!config || blocking) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/menu/${menuItem.id}/customization`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customization: toSavePayload(config) }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (Array.isArray(data?.issues)) setServerIssues(data.issues);
        throw new Error(data?.error || "No se pudo guardar");
      }
      setDirty(false);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!copySourceId || !config) return;
    if (
      config.groups.length > 0 &&
      !window.confirm("Se reemplazarán los grupos actuales por los del otro producto. ¿Continuar?")
    ) {
      return;
    }
    setCopying(true);
    setError(null);
    try {
      const response = await fetch(`/api/menu/${copySourceId}/customization`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudo copiar");
      const source: MenuItemCustomization = data.customization ?? emptyCustomization();
      if (source.groups.length === 0) {
        throw new Error("Ese producto no tiene personalización para copiar");
      }
      const cloned = cloneCustomization(source, menuItem.id);
      update(cloned);
      setExpanded(new Set(cloned.groups.map((g) => g.id)));
      setCopySourceId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo copiar");
    } finally {
      setCopying(false);
    }
  };

  const generalIssues = [
    ...issues.filter((i) => i.groupIndex == null),
    ...serverIssues.filter(
      (s) => !issues.some((i) => i.message === s.message),
    ),
  ];
  const errorCount = issues.filter((i) => i.level === "error").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-md sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-text-light"
            >
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Personalizar platillo
            </h2>
            <p className="mt-0.5 truncate text-xs text-text-light/60">
              {menuItem.name} · precio base{" "}
              <span className="font-mono font-bold tabular-nums">{money(menuItem.price)}</span>{" "}
              <span className="text-text-light/40">(se edita en el producto)</span>
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-text-light/50 transition-colors hover:bg-dark/40 hover:text-text-light cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {loading || !config ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-light/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : (
            <>
              <div className="grid gap-4 rounded-xl border border-border bg-dark/30 p-4 sm:grid-cols-2">
                <div>
                  <span className={labelClass}>Vista del modal</span>
                  <div className="flex gap-2" role="radiogroup" aria-label="Vista del modal">
                    {(
                      [
                        ["SCROLL", "Todo en una vista"],
                        ["WIZARD", "Paso a paso"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={config.layout === value}
                        onClick={() => update({ ...config, layout: value })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                          config.layout === value
                            ? "border-primary/60 bg-primary/10 text-text-light"
                            : "border-border bg-dark/40 text-text-light/60 hover:text-text-light"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-1">
                  <Switch
                    checked={config.deductBase}
                    onChange={(v) => update({ ...config, deductBase: v })}
                    label="Descontar la receta del producto base"
                  />
                  <p className="text-[11px] text-text-light/40">
                    Desactívalo si solo deben descontar las opciones (ej. combos).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-dark/30 p-3">
                <div className="min-w-48 flex-1">
                  <label htmlFor={`${titleId}-copy`} className={labelClass}>
                    Copiar personalización de otro producto
                  </label>
                  <select
                    id={`${titleId}-copy`}
                    className={inputClass}
                    value={copySourceId}
                    onChange={(e) => setCopySourceId(e.target.value)}
                  >
                    <option value="">Elegir producto…</option>
                    {menuItems
                      .filter((m) => m.id !== menuItem.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!copySourceId || copying}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-light transition hover:bg-dark/40 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  {copying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copiar
                </button>
              </div>

              {config.groups.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-light/50">
                  Este producto no tiene personalización. Agrega un grupo (ej. “Elige
                  tus tacos”, “Extras”, “Salsa”) para que el POS y Pickup abran el
                  modal al elegirlo.
                </p>
              )}

              <div className="space-y-3">
                {config.groups.map((group, gi) => (
                  <GroupEditor
                    key={group.id}
                    group={group}
                    index={gi}
                    total={config.groups.length}
                    expanded={expanded.has(group.id)}
                    onToggle={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.id)) next.delete(group.id);
                        else next.add(group.id);
                        return next;
                      })
                    }
                    menuItemId={menuItem.id}
                    menuItems={menuItems}
                    ingredients={ingredients}
                    onChange={(next) => {
                      const groups = config.groups.slice();
                      groups[gi] = next;
                      update({ ...config, groups });
                    }}
                    onMove={(delta) =>
                      update({ ...config, groups: moveItem(config.groups, gi, delta) })
                    }
                    onRemove={() => {
                      if (
                        group.options.some((o) => o.name.trim()) &&
                        !window.confirm(`¿Eliminar el grupo “${group.name || `#${gi + 1}`}”?`)
                      ) {
                        return;
                      }
                      update({
                        ...config,
                        groups: resequence(config.groups.filter((_, i) => i !== gi)),
                      });
                    }}
                    issues={issues.filter((i) => i.groupIndex === gi)}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const group = createEmptyGroup(config.groups.length);
                  update({ ...config, groups: [...config.groups, group] });
                  setExpanded((prev) => new Set(prev).add(group.id));
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-xs font-bold uppercase tracking-wider text-text-light/60 transition hover:border-primary/50 hover:text-primary cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Grupo
              </button>
            </>
          )}
        </div>

        <footer className="space-y-3 border-t border-border px-5 py-4">
          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
          {generalIssues.length > 0 && (
            <ul className="space-y-1">
              {generalIssues.map((issue, i) => (
                <li
                  key={i}
                  className={`text-[11px] font-semibold ${
                    issue.level === "error" ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-text-light/60">
              {config && hasActiveGroups && range ? (
                range.min == null ? (
                  <span className="text-red-400">Ninguna selección es posible con estas reglas</span>
                ) : (
                  <>
                    Precio estimado{" "}
                    <span className="font-mono font-bold tabular-nums text-text-light">
                      {money(range.min)}
                      {range.max == null
                        ? " en adelante"
                        : range.max !== range.min
                          ? ` – ${money(range.max)}`
                          : ""}
                    </span>
                  </>
                )
              ) : (
                <span>Sin grupos activos: el producto se agrega directo.</span>
              )}
              {errorCount > 0 && (
                <span className="ml-2 font-bold text-red-400">
                  · {errorCount} error(es) por corregir
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={!hasActiveGroups || blocking}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-dark/40 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-light transition hover:bg-dark/60 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <Eye className="h-3.5 w-3.5" /> Probar
              </button>
              <button
                type="button"
                onClick={requestClose}
                className="rounded-lg bg-dark/40 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-light/70 transition hover:text-text-light cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || saving || blocking || !config}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-dark transition hover:brightness-110 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </footer>
      </div>

      {previewOpen && previewConfig && (
        <CustomizationModal
          productName={menuItem.name}
          basePrice={menuItem.price}
          customization={previewConfig}
          confirmLabel="Listo"
          notice="Modo prueba: así lo verá el mesero. No se agrega nada al carrito."
          onConfirm={() => setPreviewOpen(false)}
          onCancel={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

"use client";

import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { CustomizationModal } from "@/components/customization/CustomizationModal";

/** Muestra el modal de personalización cuando el carrito lo solicita. */
export function POSCustomizationHost() {
  const { customizationRequest, confirmCustomization, cancelCustomization } =
    usePOSCart();

  const customization = customizationRequest?.menuItem.customization;
  if (!customizationRequest || !customization) return null;
  const { menuItem, initialSelections, kind } = customizationRequest;
  const isEdit = kind.endsWith("-edit");

  return (
    <CustomizationModal
      key={`${kind}-${menuItem.id}-${"index" in customizationRequest ? customizationRequest.index : "new"}`}
      productName={menuItem.name}
      basePrice={menuItem.price}
      customization={customization}
      initialSelections={initialSelections}
      confirmLabel={isEdit ? "Guardar cambios" : "Agregar"}
      onConfirm={(selections) => confirmCustomization(selections)}
      onCancel={cancelCustomization}
    />
  );
}

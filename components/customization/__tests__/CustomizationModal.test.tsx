import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomizationModal } from "../CustomizationModal";
import { group, option, tacosMixtos } from "@/lib/customization/__tests__/fixtures";
import type { MenuItemCustomization } from "@/lib/customization";

const renderModal = (
  customization: MenuItemCustomization,
  props: Partial<React.ComponentProps<typeof CustomizationModal>> = {},
) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <CustomizationModal
      productName="Tacos Mixtos"
      basePrice={0}
      customization={customization}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
};

describe("CustomizationModal", () => {
  it("blocks confirm with a reason until the group is complete, then confirms the selection", () => {
    const { onConfirm } = renderModal(tacosMixtos());

    const add = screen.getByRole("button", { name: /^Agregar$/ });
    expect(add).toBeDisabled();
    expect(screen.getByText("Faltan 3 en Elige tus tacos")).toBeInTheDocument();
    // Selección incompleta: precio mínimo posible, no $0
    expect(screen.getByText("Desde")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
    expect(screen.getByText("Obligatorio · Elige 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Agregar Pastor" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar Pastor" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar Birria" }));

    // Al llegar al máximo ya no deja sumar más
    expect(screen.getByRole("button", { name: "Agregar Carnitas" })).toBeDisabled();
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByText("$140.00")).toBeInTheDocument();
    expect(add).not.toBeDisabled();

    fireEvent.click(add);
    expect(onConfirm).toHaveBeenCalledWith(
      [
        { optionId: "birria", quantity: 1 },
        { optionId: "pastor", quantity: 2 },
      ],
      140,
    );
  });

  it("decrements and shows the extra price per option", () => {
    renderModal(tacosMixtos());
    expect(screen.getByText("+$10.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar Pastor" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar Pastor" }));
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("marks DISABLE out-of-stock options as Agotado and not selectable", () => {
    const config = tacosMixtos();
    config.groups[0].options[1].isOutOfStock = true; // Birria
    renderModal(config);
    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar Birria" })).toBeDisabled();
  });

  it("renders radios for single choice and checkboxes for multi choice", () => {
    const config: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("salsa", {
          name: "Salsa",
          minSelect: 1,
          maxSelect: 1,
          options: [option("verde", { name: "Verde" }), option("roja", { name: "Roja" })],
        }),
        group("extras", {
          name: "Extras",
          sortOrder: 1,
          maxSelect: 2,
          options: [option("queso", { name: "Queso", priceDelta: 15 }), option("cebolla", { name: "Cebolla" })],
        }),
      ],
    };
    const { onConfirm } = renderModal(config, { basePrice: 50, confirmLabel: "Guardar cambios" });
    const radios = screen.getAllByRole("radio");
    const checkboxes = screen.getAllByRole("checkbox");
    expect(radios).toHaveLength(2);
    expect(checkboxes).toHaveLength(2);

    fireEvent.click(screen.getByRole("radio", { name: /Verde/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Roja/ }));
    expect(screen.getByRole("radio", { name: /Roja/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Verde/ })).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("checkbox", { name: /Queso/ }));
    expect(screen.getByText("$65.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onConfirm).toHaveBeenCalledWith(
      [
        { optionId: "queso", quantity: 1 },
        { optionId: "roja", quantity: 1 },
      ],
      65,
    );
  });

  it("wizard layout advances only when the current step is satisfied", () => {
    const config: MenuItemCustomization = {
      layout: "WIZARD",
      deductBase: true,
      groups: [
        group("base", {
          name: "Base",
          minSelect: 1,
          maxSelect: 1,
          options: [option("arroz", { name: "Arroz" })],
        }),
        group("prote", {
          name: "Proteína",
          sortOrder: 1,
          minSelect: 1,
          maxSelect: 1,
          options: [option("pollo", { name: "Pollo" }), option("res", { name: "Res" })],
        }),
      ],
    };
    const { onConfirm } = renderModal(config);
    expect(screen.getByText("Paso 1 de 2")).toBeInTheDocument();
    // "Arroz" es la única opción de un radio obligatorio ⇒ viene preseleccionada
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText("Paso 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Agregar$/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Res/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Agregar$/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      [
        { optionId: "arroz", quantity: 1 },
        { optionId: "res", quantity: 1 },
      ],
      0,
    );
    // Atrás vuelve al paso 1 (verificación de navegación)
  });

  it("starts from the initial selection when editing and closes with Escape", () => {
    const { onCancel } = renderModal(tacosMixtos(), {
      initialSelections: [{ optionId: "carnitas", quantity: 3 }],
    });
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });
});

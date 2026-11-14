import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomizationEditorModal } from "../CustomizationEditorModal";
import { tacosMixtos } from "@/lib/customization/__tests__/fixtures";

const menuItems = [
  { id: "mi-mixtos", name: "Tacos Mixtos", price: 0 },
  { id: "mi-bowl", name: "Bowl", price: 90 },
];

function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status = 200, body } = handler(url, init) as { status?: number; body: unknown };
    return { ok: status < 400, status, json: async () => body } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("CustomizationEditorModal", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderEditor = () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(
      <CustomizationEditorModal
        menuItem={menuItems[0]}
        menuItems={menuItems}
        ingredients={[]}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );
    return { onClose, onSaved };
  };

  it("loads the config, shows the price range and saves the normalized payload", async () => {
    const fetchMock = mockFetch((url, init) => {
      if (init?.method === "PUT") return { body: { ok: true } };
      return { body: { customization: tacosMixtos() } };
    });
    const { onClose, onSaved } = renderEditor();

    expect(await screen.findByText("Elige tus tacos")).toBeInTheDocument();
    expect(screen.getByText("$120.00 – $150.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/menu/mi-mixtos/customization");
    const body = JSON.parse(String(init?.body));
    expect(body.customization.groups[0]).toMatchObject({
      name: "Elige tus tacos",
      minSelect: 3,
      maxSelect: 3,
      pricingMode: "TIERED",
      tierMatchMode: "EXACT",
    });
    expect(body.customization.groups[0].options).toHaveLength(4);
  });

  it("disables saving while there are blocking errors", async () => {
    mockFetch(() => ({ body: { customization: { layout: "SCROLL", deductBase: true, groups: [] } } }));
    renderEditor();
    expect(
      await screen.findByText(/Este producto no tiene personalización/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Grupo$/ }));
    // Grupo nuevo sin nombre ⇒ error
    expect(await screen.findByText("El grupo #1 necesita nombre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nombre del grupo"), {
      target: { value: "Salsa" },
    });
    fireEvent.change(screen.getByLabelText("Opción #1"), {
      target: { value: "Verde" },
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Guardar" })).not.toBeDisabled(),
    );
  });

  it("copies another product's customization with new ids", async () => {
    mockFetch((url) => {
      if (url.includes("mi-bowl")) return { body: { customization: tacosMixtos() } };
      return { body: { customization: { layout: "SCROLL", deductBase: true, groups: [] } } };
    });
    renderEditor();
    await screen.findByText(/Este producto no tiene personalización/);

    fireEvent.change(
      screen.getByLabelText("Copiar personalización de otro producto"),
      { target: { value: "mi-bowl" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Copiar$/ }));
    expect(await screen.findByDisplayValue("Elige tus tacos")).toBeInTheDocument();
  });

  it("shows server-side errors on save", async () => {
    mockFetch((url, init) => {
      if (init?.method === "PUT") {
        return { status: 400, body: { error: "Un producto enlazado no existe en este restaurante" } };
      }
      return { body: { customization: tacosMixtos() } };
    });
    const { onClose } = renderEditor();
    await screen.findByText("Elige tus tacos");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("Un producto enlazado no existe en este restaurante"),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens the preview modal with Probar", async () => {
    mockFetch(() => ({ body: { customization: tacosMixtos() } }));
    renderEditor();
    await screen.findByText("Elige tus tacos");
    fireEvent.click(screen.getByRole("button", { name: /Probar/ }));
    expect(screen.getByText(/Modo prueba/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar Pastor" }));
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });
});

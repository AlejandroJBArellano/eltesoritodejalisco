import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CustomerWhatsAppModal,
  formatWhatsAppPhone,
  buildTemplateMessage,
} from "../CustomerWhatsAppModal";

const mockTenant = {
  id: "tenant-123",
  name: "Tacos El Pastorcito",
  system_name: "KittnOS",
};

let currentTenant: { id: string; name: string; system_name: string } | null = mockTenant;

vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => currentTenant,
}));

describe("CustomerWhatsAppModal Utilities", () => {
  it("formatWhatsAppPhone should format numbers correctly", () => {
    expect(formatWhatsAppPhone("")).toBe("");
    expect(formatWhatsAppPhone("abc")).toBe("");
    // 10 digits Mexican format
    expect(formatWhatsAppPhone("3312345678")).toBe("523312345678");
    expect(formatWhatsAppPhone("(33) 1234-5678")).toBe("523312345678");
    // Already includes country code
    expect(formatWhatsAppPhone("+523312345678")).toBe("523312345678");
    expect(formatWhatsAppPhone("+14155552671")).toBe("14155552671");
  });

  it("buildTemplateMessage should generate appropriate text for each template", () => {
    const params = {
      template: "saldo" as const,
      customerName: "Carlos Ruiz",
      tenantName: "Tacos El Pastorcito",
      debtBalance: 250,
      loyaltyPoints: 15,
    };

    // Saldo con deuda
    const saldoMsg = buildTemplateMessage(params);
    expect(saldoMsg).toContain("Carlos Ruiz");
    expect(saldoMsg).toContain("Tacos El Pastorcito");
    expect(saldoMsg).toContain("$250.00");

    // Saldo sin deuda
    const saldoZeroMsg = buildTemplateMessage({ ...params, debtBalance: 0 });
    expect(saldoZeroMsg).toContain("al corriente");

    // Pedido
    const pedidoMsg = buildTemplateMessage({ ...params, template: "pedido" });
    expect(pedidoMsg).toContain("registramos tu pedido");

    // Aviso
    const avisoMsg = buildTemplateMessage({ ...params, template: "aviso" });
    expect(avisoMsg).toContain("15 puntos");

    // Personalizado
    const customMsg = buildTemplateMessage({ ...params, template: "personalizado" });
    expect(customMsg).toBe("¡Hola Carlos Ruiz! Te saludamos de Tacos El Pastorcito. ");

    // Unknown template fallback
    // @ts-expect-error testing invalid template key
    expect(buildTemplateMessage({ ...params, template: "invalido" })).toBe("");
  });
});

describe("CustomerWhatsAppModal Component", () => {
  const customerWithDebt = {
    id: "cust-1",
    name: "Ana Morales",
    phone: "3311223344",
    email: "ana@test.com",
    debt_balance: 380.5,
    loyalty_points: 45,
    pending_orders_count: 1,
  };

  const customerWithoutDebtOrPhone = {
    id: "cust-2",
    name: "Roberto Gómez",
    phone: null,
    email: "roberto@test.com",
    debt_balance: 0,
    loyalty_points: 10,
    pending_orders_count: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentTenant = mockTenant;
    global.window.open = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it("falls back to default tenant name Kittn when useTenant returns null", () => {
    currentTenant = null;
    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /Mensaje a enviar/i });
    expect((textarea as HTMLTextAreaElement).value).toContain("Te saludamos de Kittn.");
  });

  it("does not render when isOpen is false or customer is null", () => {
    const { container, rerender } = render(
      <CustomerWhatsAppModal
        isOpen={false}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={null}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders with debt customer and defaults to Saldo Pendiente template", () => {
    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );

    expect(screen.getByText("Acciones Rápidas WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Cliente: Ana Morales")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3311223344")).toBeInTheDocument();
    expect(screen.getByText("wa.me/523311223344")).toBeInTheDocument();

    const textarea = screen.getByRole("textbox", { name: /Mensaje a enviar/i });
    expect((textarea as HTMLTextAreaElement).value).toContain("saldo pendiente de $380.50");
  });

  it("defaults to Aviso / Promoción template when customer has no debt balance", () => {
    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithoutDebtOrPhone}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /Mensaje a enviar/i });
    expect((textarea as HTMLTextAreaElement).value).toContain("10 puntos en tu saldo");
  });

  it("switches templates when clicking template buttons", async () => {
    const user = userEvent.setup();
    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /Mensaje a enviar/i });

    // Switch to Confirmación de Pedido
    await user.click(screen.getByText("Confirmación de Pedido"));
    expect((textarea as HTMLTextAreaElement).value).toContain("registramos tu pedido");

    // Switch to Aviso / Promoción
    await user.click(screen.getByText("Aviso / Promoción"));
    expect((textarea as HTMLTextAreaElement).value).toContain("45 puntos");

    // Switch to Mensaje Libre
    await user.click(screen.getByText("Mensaje Libre"));
    expect((textarea as HTMLTextAreaElement).value).toBe("¡Hola Ana Morales! Te saludamos de Tacos El Pastorcito. ");

    // Switch back to Saldo Pendiente
    await user.click(screen.getByText("Saldo Pendiente"));
    expect((textarea as HTMLTextAreaElement).value).toContain("saldo pendiente de $380.50");
  });

  it("allows typing directly in the message textarea", async () => {
    const user = userEvent.setup();
    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /Mensaje a enviar/i });
    await user.clear(textarea);
    await user.type(textarea, "Mensaje de prueba personalizado 123");

    expect(textarea).toHaveValue("Mensaje de prueba personalizado 123");
    expect(screen.getByText("35 caracteres")).toBeInTheDocument();
  });

  it("copies message to clipboard and displays feedback", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );

    const copyBtn = screen.getByRole("button", { name: /Copiar Mensaje/i });
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining("saldo pendiente")
    );
    expect(screen.getByText("Copiado")).toBeInTheDocument();
  });

  it("handles copy failure gracefully with error alert", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );

    const copyBtn = screen.getByRole("button", { name: /Copiar Mensaje/i });
    await user.click(copyBtn);

    expect(
      screen.getByText("No se pudo copiar el mensaje al portapapeles.")
    ).toBeInTheDocument();
  });

  it("validates phone number when attempting to open WhatsApp", async () => {
    const user = userEvent.setup();
    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithoutDebtOrPhone}
      />
    );

    const openBtn = screen.getByRole("button", { name: /Abrir WhatsApp/i });
    // Phone is empty
    const phoneInput = screen.getByPlaceholderText("Ej. 3312345678");
    await user.clear(phoneInput);
    await user.click(openBtn);

    expect(
      screen.getByText("Ingresa un número celular válido de al menos 10 dígitos.")
    ).toBeInTheDocument();

    // Dismiss error alert
    await user.click(screen.getByText("✕"));
    expect(
      screen.queryByText("Ingresa un número celular válido de al menos 10 dígitos.")
    ).not.toBeInTheDocument();

    // Type less than 10 digits
    await user.type(phoneInput, "12345");
    await user.click(openBtn);
    expect(
      screen.getByText("Ingresa un número celular válido de al menos 10 dígitos.")
    ).toBeInTheDocument();
  });

  it("validates empty message when attempting to open WhatsApp", async () => {
    const user = userEvent.setup();
    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /Mensaje a enviar/i });
    await user.clear(textarea);

    const openBtn = screen.getByRole("button", { name: /Abrir WhatsApp/i });
    await user.click(openBtn);

    expect(screen.getByText("El mensaje no puede estar vacío.")).toBeInTheDocument();
  });

  it("opens WhatsApp directly when valid phone and does not save if unchecked", async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();

    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={onCloseMock}
        customer={customerWithDebt}
      />
    );

    const openBtn = screen.getByRole("button", { name: /Abrir WhatsApp/i });
    await user.click(openBtn);

    expect(global.window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/523311223344?text="),
      "_blank",
      "noopener,noreferrer"
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("saves phone to profile if checkbox is checked and phone changed or was empty", async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();
    const onCustomerUpdatedMock = vi.fn();

    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={onCloseMock}
        customer={customerWithoutDebtOrPhone}
        onCustomerUpdated={onCustomerUpdatedMock}
      />
    );

    const phoneInput = screen.getByPlaceholderText("Ej. 3312345678");
    await user.type(phoneInput, "3399887766");

    const checkbox = screen.getByLabelText(/Guardar número en el perfil del cliente/i);
    expect(checkbox).toBeChecked();

    const openBtn = screen.getByRole("button", { name: /Abrir WhatsApp/i });
    await user.click(openBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "cust-2",
          name: "Roberto Gómez",
          phone: "3399887766",
        }),
      });
    });

    expect(onCustomerUpdatedMock).toHaveBeenCalled();
    expect(global.window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/523399887766?text="),
      "_blank",
      "noopener,noreferrer"
    );
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("handles profile update failure when saving phone", async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Error en base de datos" }),
    });

    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={onCloseMock}
        customer={customerWithoutDebtOrPhone}
      />
    );

    const phoneInput = screen.getByPlaceholderText("Ej. 3312345678");
    await user.type(phoneInput, "3399887766");

    const openBtn = screen.getByRole("button", { name: /Abrir WhatsApp/i });
    await user.click(openBtn);

    await waitFor(() => {
      expect(screen.getByText("Error en base de datos")).toBeInTheDocument();
    });

    expect(global.window.open).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it("toggles savePhone checkbox", async () => {
    const user = userEvent.setup();
    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithoutDebtOrPhone}
      />
    );

    const checkbox = screen.getByLabelText(/Guardar número en el perfil del cliente/i);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("does not attempt to copy when message is empty", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithDebt}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /Mensaje a enviar/i });
    await user.clear(textarea);

    const copyBtn = screen.getByRole("button", { name: /Copiar Mensaje/i });
    await user.click(copyBtn);

    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it("handles profile update failure without specific error message and non-Error exception", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("Cannot parse json");
      },
    });

    const { rerender } = render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={customerWithoutDebtOrPhone}
      />
    );

    const phoneInput = screen.getByPlaceholderText("Ej. 3312345678");
    await user.type(phoneInput, "3399887766");

    const openBtn = screen.getByRole("button", { name: /Abrir WhatsApp/i });
    await user.click(openBtn);

    await waitFor(() => {
      expect(screen.getByText("Error al actualizar teléfono")).toBeInTheDocument();
    });

    // Test non-Error throw
    global.fetch = vi.fn().mockRejectedValue("String error");
    rerender(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={vi.fn()}
        customer={{ ...customerWithoutDebtOrPhone, id: "cust-3" }}
      />
    );

    const phoneInput2 = screen.getByPlaceholderText("Ej. 3312345678");
    await user.type(phoneInput2, "3399887766");
    await user.click(screen.getByRole("button", { name: /Abrir WhatsApp/i }));

    await waitFor(() => {
      expect(
        screen.getByText("No se pudo guardar el teléfono en el perfil.")
      ).toBeInTheDocument();
    });
  });

  it("handles customer with undefined loyalty points and debt balance and saves phone without onCustomerUpdated callback", async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();

    const minimalCustomer = {
      id: "cust-minimal",
      name: "Pedro Páramo",
    };

    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={onCloseMock}
        customer={minimalCustomer}
      />
    );

    expect(screen.getByText("0 pts acumulados")).toBeInTheDocument();
    expect(screen.getByText("Al corriente")).toBeInTheDocument();

    await user.click(screen.getByText("Aviso / Promoción"));
    expect(
      (screen.getByRole("textbox", { name: /Mensaje a enviar/i }) as HTMLTextAreaElement).value
    ).toContain("0 puntos en tu saldo");

    await user.click(screen.getByText("Saldo Pendiente"));
    expect(
      (screen.getByRole("textbox", { name: /Mensaje a enviar/i }) as HTMLTextAreaElement).value
    ).toContain("al corriente sin adeudos pendientes");

    const phoneInput = screen.getByPlaceholderText("Ej. 3312345678");
    await user.type(phoneInput, "3311992288");

    const openBtn = screen.getByRole("button", { name: /Abrir WhatsApp/i });
    await user.click(openBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "cust-minimal",
          name: "Pedro Páramo",
          phone: "3311992288",
        }),
      });
    });

    expect(global.window.open).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("calls onClose when clicking Cancel button", async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();

    render(
      <CustomerWhatsAppModal
        isOpen={true}
        onClose={onCloseMock}
        customer={customerWithDebt}
      />
    );

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(onCloseMock).toHaveBeenCalled();
  });
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POSManagerAuthModal } from "../POSManagerAuthModal";

describe("POSManagerAuthModal", () => {
  const mockOnClose = vi.fn();
  const mockOnAuthorize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("does not render when isOpen is false", () => {
    render(
      <POSManagerAuthModal
        isOpen={false}
        onClose={mockOnClose}
        title="Autorizar Cancelación"
        onAuthorize={mockOnAuthorize}
      />
    );
    expect(screen.queryByText("Autorizar Cancelación")).not.toBeInTheDocument();
  });

  it("renders modal with title, description and quick reasons when open", () => {
    render(
      <POSManagerAuthModal
        isOpen={true}
        onClose={mockOnClose}
        title="Autorizar Cancelación"
        description="Se requiere autorización para continuar"
        onAuthorize={mockOnAuthorize}
      />
    );

    expect(screen.getByText("Autorizar Cancelación")).toBeInTheDocument();
    expect(screen.getByText("Se requiere autorización para continuar")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Error de captura" })).toBeInTheDocument();
  });

  it("shows error when submitting without entering PIN", async () => {
    render(
      <POSManagerAuthModal
        isOpen={true}
        onClose={mockOnClose}
        title="Autorizar Cancelación"
        onAuthorize={mockOnAuthorize}
      />
    );

    const submitBtn = screen.getByRole("button", { name: "Autorizar" });
    expect(submitBtn).toBeDisabled();
    const input = screen.getByPlaceholderText("••••");
    fireEvent.change(input, { target: { value: " " } });
    fireEvent.submit(input.closest("form")!);

    expect(await screen.findByText("Ingresa el PIN de autorización")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("displays error message if verify-pin returns invalid", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ valid: false, error: "PIN de autorización incorrecto" }),
    });

    render(
      <POSManagerAuthModal
        isOpen={true}
        onClose={mockOnClose}
        title="Autorizar Cancelación"
        onAuthorize={mockOnAuthorize}
      />
    );

    const input = screen.getByPlaceholderText("••••");
    fireEvent.change(input, { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    expect(await screen.findByText("PIN de autorización incorrecto")).toBeInTheDocument();
    expect(mockOnAuthorize).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("authorizes successfully and passes pin, reason, and manager name", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
        manager: { id: "mgr-1", name: "Gerente Carlos", role: "MANAGER" },
      }),
    });

    render(
      <POSManagerAuthModal
        isOpen={true}
        onClose={mockOnClose}
        title="Autorizar Cancelación"
        onAuthorize={mockOnAuthorize}
      />
    );

    // Select a quick reason
    fireEvent.click(screen.getByRole("button", { name: "Cliente canceló" }));

    const input = screen.getByPlaceholderText("••••");
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "1234" }),
      });
      expect(mockOnAuthorize).toHaveBeenCalledWith({
        pin: "1234",
        reason: "Cliente canceló",
        managerName: "Gerente Carlos",
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("allows selecting Otro and entering a custom reason", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, manager: { name: "Admin" } }),
    });

    render(
      <POSManagerAuthModal
        isOpen={true}
        onClose={mockOnClose}
        title="Autorizar Cancelación"
        onAuthorize={mockOnAuthorize}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Otro" }));
    const customReasonInput = screen.getByPlaceholderText("Especifica el motivo...");
    fireEvent.change(customReasonInput, { target: { value: "Mesa se cambió de lugar" } });

    const pinInput = screen.getByPlaceholderText("••••");
    fireEvent.change(pinInput, { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    await waitFor(() => {
      expect(mockOnAuthorize).toHaveBeenCalledWith({
        pin: "1234",
        reason: "Mesa se cambió de lugar",
        managerName: "Admin",
      });
    });
  });

  it("closes modal when clicking Cancelar or X button", () => {
    render(
      <POSManagerAuthModal
        isOpen={true}
        onClose={mockOnClose}
        title="Autorizar Cancelación"
        onAuthorize={mockOnAuthorize}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Cerrar"));
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it("handles network error during pin verification", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network Error"));

    render(
      <POSManagerAuthModal
        isOpen={true}
        onClose={mockOnClose}
        title="Autorizar Cancelación"
        onAuthorize={mockOnAuthorize}
      />
    );

    const input = screen.getByPlaceholderText("••••");
    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Autorizar" }));

    expect(await screen.findByText("Error al verificar PIN de autorización")).toBeInTheDocument();
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomerQRModal } from "../CustomerQRModal";

describe("CustomerQRModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    tenantSlug: "tesorito",
    tenantName: "El Tesorito de Jalisco",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when isOpen is true with QR image and info", () => {
    render(<CustomerQRModal {...defaultProps} />);

    expect(screen.getByText("QR de Registro de Clientes")).toBeInTheDocument();
    expect(screen.getByText("El Tesorito de Jalisco")).toBeInTheDocument();
    expect(
      screen.getByText("¡Escanea y únete a nuestro club de clientes!"),
    ).toBeInTheDocument();

    const img = screen.getByTestId("qr-registration-img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", expect.stringContaining("api.qrserver.com"));
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <CustomerQRModal {...defaultProps} isOpen={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("copies registration link to clipboard", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CustomerQRModal {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /Copiar/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Copiado")).toBeInTheDocument();
    });
  });

  it("calls window.print when clicking Imprimir", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(<CustomerQRModal {...defaultProps} />);

    const printBtn = screen.getByRole("button", { name: /Imprimir/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("handles QR download trigger", async () => {
    const mockBlob = new Blob(["fake-image-content"], { type: "image/png" });
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(mockBlob),
    } as any);

    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake-url");
    window.URL.revokeObjectURL = vi.fn();

    render(<CustomerQRModal {...defaultProps} />);

    const downloadBtn = screen.getByRole("button", { name: /Descargar PNG/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it("handles copy link failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });

    render(<CustomerQRModal {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /Copiar/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it("handles download failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<CustomerQRModal {...defaultProps} />);

    const downloadBtn = screen.getByRole("button", { name: /Descargar PNG/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});

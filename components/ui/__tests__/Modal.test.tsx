import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../Modal";

describe("Modal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Modal de Prueba",
    children: <div>Contenido del modal</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = "unset";
  });

  it("does not render when isOpen is false", () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Modal de Prueba")).not.toBeInTheDocument();
  });

  it("renders correctly with title, subtitle, icon and content", () => {
    render(
      <Modal
        {...defaultProps}
        subtitle="Subtítulo informativo"
        icon={<span data-testid="modal-icon">Icon</span>}
        maxWidth="lg"
      />,
    );

    expect(screen.getByText("Modal de Prueba")).toBeInTheDocument();
    expect(screen.getByText("Subtítulo informativo")).toBeInTheDocument();
    expect(screen.getByTestId("modal-icon")).toBeInTheDocument();
    expect(screen.getByText("Contenido del modal")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("calls onClose when clicking close button", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByTitle(/Cerrar/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when pressing Escape key", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when pressing other keys", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("resets document overflow on unmount", () => {
    const { unmount } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("unset");
  });

  it("supports various maxWidth configurations", () => {
    const { rerender } = render(<Modal {...defaultProps} maxWidth="sm" />);
    expect(screen.getByText("Contenido del modal")).toBeInTheDocument();

    rerender(<Modal {...defaultProps} maxWidth="2xl" />);
    expect(screen.getByText("Contenido del modal")).toBeInTheDocument();

    rerender(<Modal {...defaultProps} maxWidth="3xl" />);
    expect(screen.getByText("Contenido del modal")).toBeInTheDocument();
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StripeEmbeddedOnboardingModal } from "../settings/StripeEmbeddedOnboardingModal";

// Mock @stripe/connect-js and @stripe/react-connect-js
const mockLoadConnectAndInitialize = vi.fn();
vi.mock("@stripe/connect-js", () => ({
  loadConnectAndInitialize: (...args: unknown[]) =>
    mockLoadConnectAndInitialize(...args),
}));

vi.mock("@stripe/react-connect-js", () => ({
  ConnectComponentsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="connect-provider">{children}</div>
  ),
  ConnectAccountOnboarding: ({ onExit }: { onExit?: () => void }) => (
    <div data-testid="connect-onboarding">
      <button onClick={onExit}>Finalizar</button>
    </div>
  ),
}));

describe("StripeEmbeddedOnboardingModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123456";
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <StripeEmbeddedOnboardingModal isOpen={false} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows error when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    render(<StripeEmbeddedOnboardingModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("No disponible")).toBeInTheDocument();
  });

  it("initializes Connect instance and renders onboarding component", async () => {
    const mockInstance = {};
    mockLoadConnectAndInitialize.mockReturnValue(mockInstance);

    render(<StripeEmbeddedOnboardingModal isOpen={true} onClose={vi.fn()} />);

    expect(mockLoadConnectAndInitialize).toHaveBeenCalledWith(
      expect.objectContaining({
        publishableKey: "pk_test_123456",
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("connect-onboarding")).toBeInTheDocument();
    });
  });

  it("calls onSuccess and onClose when user exits onboarding", async () => {
    const mockInstance = {};
    mockLoadConnectAndInitialize.mockReturnValue(mockInstance);
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <StripeEmbeddedOnboardingModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Finalizar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Finalizar"));

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("fetches client secret properly in fetchClientSecret callback", async () => {
    let capturedOptions: any;
    mockLoadConnectAndInitialize.mockImplementation((opts) => {
      capturedOptions = opts;
      return {};
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ client_secret: "sec_12345" }),
    });

    render(<StripeEmbeddedOnboardingModal isOpen={true} onClose={vi.fn()} />);

    expect(capturedOptions).toBeDefined();
    const secret = await capturedOptions.fetchClientSecret();
    expect(secret).toBe("sec_12345");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/stripe/connect/account-session",
      { method: "POST" },
    );
  });
});

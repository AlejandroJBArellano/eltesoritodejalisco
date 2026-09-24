import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StripeEmbeddedOnboardingModal } from "../StripeEmbeddedOnboardingModal";
import * as stripeConnectJs from "@stripe/connect-js";

vi.mock("@stripe/connect-js", () => ({
  loadConnectAndInitialize: vi.fn(),
}));

vi.mock("@stripe/react-connect-js", () => ({
  ConnectComponentsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-connect-provider">{children}</div>
  ),
  ConnectAccountOnboarding: ({ onExit }: { onExit: () => void }) => (
    <button data-testid="stripe-onboarding-exit" onClick={onExit}>
      Exit Onboarding
    </button>
  ),
}));

describe("StripeEmbeddedOnboardingModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_12345";
  });

  it("does not initialize when closed", () => {
    render(
      <StripeEmbeddedOnboardingModal
        isOpen={false}
        onClose={vi.fn()}
      />,
    );

    expect(stripeConnectJs.loadConnectAndInitialize).not.toHaveBeenCalled();
    expect(screen.queryByText("Conectar Pagos con Stripe")).not.toBeInTheDocument();
  });

  it("initializes Stripe Connect and renders provider when open", async () => {
    const mockInstance = {} as unknown as stripeConnectJs.StripeConnectInstance;
    vi.mocked(stripeConnectJs.loadConnectAndInitialize).mockReturnValue(mockInstance);

    render(
      <StripeEmbeddedOnboardingModal
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(stripeConnectJs.loadConnectAndInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          publishableKey: "pk_test_12345",
        }),
      );
    });

    expect(await screen.findByTestId("stripe-connect-provider")).toBeInTheDocument();
  });

  it("handles missing publishable key gracefully", async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    render(
      <StripeEmbeddedOnboardingModal
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("No disponible")).toBeInTheDocument();
  });

  it("calls onSuccess and onClose when exiting onboarding", async () => {
    const mockInstance = {} as unknown as stripeConnectJs.StripeConnectInstance;
    vi.mocked(stripeConnectJs.loadConnectAndInitialize).mockReturnValue(mockInstance);
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <StripeEmbeddedOnboardingModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const exitBtn = await screen.findByTestId("stripe-onboarding-exit");
    fireEvent.click(exitBtn);

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("handles initialization error gracefully", async () => {
    vi.mocked(stripeConnectJs.loadConnectAndInitialize).mockImplementation(() => {
      throw new Error("Initialization failed");
    });

    render(
      <StripeEmbeddedOnboardingModal
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("Initialization failed")).toBeInTheDocument();
  });
});

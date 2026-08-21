import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PushNotificationPrompt } from "../PushNotificationPrompt";

describe("PushNotificationPrompt Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Notification, ServiceWorker, PushManager on window/navigator
    Object.defineProperty(window, "Notification", {
      writable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      value: {
        register: vi.fn().mockResolvedValue({}),
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn().mockResolvedValue({
              endpoint: "https://push.example.com/test",
              toJSON: () => ({
                endpoint: "https://push.example.com/test",
                keys: { p256dh: "key", auth: "auth" },
              }),
            }),
          },
        }),
      },
    });

    (window as any).PushManager = class {};
  });

  it("renders compact mode button correctly", async () => {
    render(<PushNotificationPrompt compact role="KITCHEN" />);
    const button = await screen.findByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/Activar Notificaciones/i);
  });

  it("renders full banner mode with title and description", async () => {
    render(<PushNotificationPrompt role="ADMIN" />);
    const heading = await screen.findByText(/Notificaciones Web Push/i);
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByText(/Recibe alertas en tiempo real/i),
    ).toBeInTheDocument();
  });
});

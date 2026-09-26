import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushNotificationPrompt } from "../PushNotificationPrompt";

describe("PushNotificationPrompt Component", () => {
  const originalProcessEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalProcessEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZ_FjPOUS270GqqWTH3VDu14q1V-j3OjF9p5FU8",
    };

    if (typeof window.atob === "undefined") {
      window.atob = (str: string) => Buffer.from(str, "base64").toString("binary");
    }

    Object.defineProperty(window, "Notification", {
      writable: true,
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({
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

    (window as unknown as { PushManager: unknown }).PushManager = class {};
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it("renders compact mode button correctly", async () => {
    render(<PushNotificationPrompt compact role="KITCHEN" />);
    const button = await screen.findByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/Activar Notificaciones/i);
    expect(button).toHaveTextContent(/Activar/i);
  });

  it("renders full banner mode with title and description", async () => {
    render(<PushNotificationPrompt role="ADMIN" />);
    const heading = await screen.findByText(/Notificaciones Web Push/i);
    expect(heading).toBeInTheDocument();
    expect(
      screen.getByText(/Recibe alertas en tiempo real/i),
    ).toBeInTheDocument();
  });

  it("renders null if push notifications are unsupported in browser", () => {
    const originalPushManager = (window as unknown as { PushManager?: unknown }).PushManager;
    delete (window as unknown as { PushManager?: unknown }).PushManager;

    const { container } = render(<PushNotificationPrompt compact />);
    expect(container).toBeEmptyDOMElement();

    (window as unknown as { PushManager?: unknown }).PushManager = originalPushManager;
  });

  it("handles service worker registration catch warning gracefully", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockRejectedValue(new Error("SW error")),
      },
    });

    render(<PushNotificationPrompt compact role="ADMIN" />);
    const button = await screen.findByRole("button");
    expect(button).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("renders compact mode when already subscribed", async () => {
    const mockSub = {
      endpoint: "https://push.example.com/test",
      toJSON: () => ({ endpoint: "https://push.example.com/test" }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
      },
    });

    render(<PushNotificationPrompt compact role="ADMIN" />);
    const button = await screen.findByRole("button");
    expect(button).toHaveTextContent(/Notificaciones Activas/i);
    expect(button).toHaveTextContent(/Activas/i);
  });

  it("renders denied permission state in compact mode", async () => {
    Object.defineProperty(window, "Notification", {
      writable: true,
      configurable: true,
      value: {
        permission: "denied",
        requestPermission: vi.fn().mockResolvedValue("denied"),
      },
    });

    render(<PushNotificationPrompt compact role="ADMIN" />);
    const button = await screen.findByRole("button");
    expect(button).toHaveTextContent(/Notificaciones Bloqueadas/i);
    expect(button).toHaveTextContent(/Bloqueadas/i);
  });

  it("handles successful subscription flow when clicking button", async () => {
    const user = userEvent.setup();
    render(<PushNotificationPrompt compact role="ADMIN" />);

    const button = await screen.findByRole("button");
    expect(button).toHaveTextContent(/Activar Notificaciones/i);

    await user.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications/push/subscribe",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    await waitFor(() => {
      expect(button).toHaveTextContent(/Notificaciones Activas/i);
    });
  });

  it("handles unsubscribing when clicking active notification button", async () => {
    const user = userEvent.setup();
    const mockUnsubscribe = vi.fn().mockResolvedValue(true);
    const mockSub = {
      endpoint: "https://push.example.com/test",
      toJSON: () => ({ endpoint: "https://push.example.com/test" }),
      unsubscribe: mockUnsubscribe,
    };

    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
      },
    });

    render(<PushNotificationPrompt compact role="ADMIN" />);
    const button = await screen.findByRole("button");
    expect(button).toHaveTextContent(/Notificaciones Activas/i);

    await user.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications/push/unsubscribe",
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(button).toHaveTextContent(/Activar Notificaciones/i);
    });
  });

  it("handles unsubscription error if unsubscription fails", async () => {
    const user = userEvent.setup();
    const mockSub = {
      endpoint: "https://push.example.com/test",
      toJSON: () => ({ endpoint: "https://push.example.com/test" }),
      unsubscribe: vi.fn().mockRejectedValue(new Error("Fallo al desuscribir")),
    };

    Object.defineProperty(navigator, "serviceWorker", {
      writable: true,
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
      },
    });

    render(<PushNotificationPrompt role="ADMIN" />);
    const button = await screen.findByRole("button", { name: /Desactivar/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Fallo al desuscribir/i)).toBeInTheDocument();
    });
  });

  it("displays error when user denies permission during subscription request", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "Notification", {
      writable: true,
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("denied"),
      },
    });

    render(<PushNotificationPrompt role="ADMIN" />);
    const button = await screen.findByRole("button", { name: /Activar Alertas/i });

    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Notificaciones bloqueadas en tu navegador/i),
      ).toBeInTheDocument();
    });
  });

  it("stops without subscribing if permission is dismissed/default", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "Notification", {
      writable: true,
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("default"),
      },
    });

    render(<PushNotificationPrompt role="ADMIN" />);
    const button = await screen.findByRole("button", { name: /Activar Alertas/i });

    await user.click(button);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it("handles missing VAPID public key gracefully", async () => {
    const user = userEvent.setup();
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    render(<PushNotificationPrompt role="ADMIN" />);
    const button = await screen.findByRole("button", { name: /Activar Alertas/i });

    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY/i),
      ).toBeInTheDocument();
    });
  });

  it("displays backend error message on subscription failure in full banner", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Servidor no disponible" }),
    });

    render(<PushNotificationPrompt role="ADMIN" />);
    const button = await screen.findByRole("button", { name: /Activar Alertas/i });

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Servidor no disponible/i)).toBeInTheDocument();
    });
  });
});

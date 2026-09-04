import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Navbar from "../Navbar";
import { usePathname } from "next/navigation";
import { useOptionalUser } from "@/components/UserProvider";
import { useTenant } from "@/components/TenantProvider";

let authStateCallback: ((event: string, session: any) => void) | null = null;
const unsubscribeMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@/app/login/actions", () => ({
  logout: vi.fn(),
}));

vi.mock("@/components/TenantProvider", () => ({
  useTenant: vi.fn(),
}));

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
}));

vi.mock("@/components/notifications/PushNotificationPrompt", () => ({
  PushNotificationPrompt: ({ role }: { role?: string }) => (
    <div data-testid="push-notification-prompt" data-role={role}>
      PushPrompt
    </div>
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: "admin@test.com" } },
      }),
      onAuthStateChange: (cb: any) => {
        authStateCallback = cb;
        return {
          data: {
            subscription: {
              unsubscribe: unsubscribeMock,
            },
          },
        };
      },
    },
  }),
}));

describe("Navbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useTenant).mockReturnValue({
      system_name: "KittnOS",
      name: "Kittn",
    } as any);
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: { email: "admin@test.com" } as any,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isAuthenticated: true,
    });
  });

  it("returns null when on /login page", () => {
    vi.mocked(usePathname).mockReturnValue("/login");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when on /auth page", () => {
    vi.mocked(usePathname).mockReturnValue("/auth/callback");
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when email is null initially", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isAuthenticated: false,
    });

    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders navigation links including 'Historial' for ADMIN role", () => {
    render(<Navbar />);

    expect(screen.getByText("POS")).toBeInTheDocument();
    expect(screen.getByText("Cocina")).toBeInTheDocument();
    expect(screen.getByText("Historial")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("KITTN")).toBeInTheDocument();
    expect(screen.getByText("OS")).toBeInTheDocument();
  });

  it("highlights active link based on current pathname", () => {
    vi.mocked(usePathname).mockReturnValue("/pos");
    render(<Navbar />);

    const posLink = screen.getByRole("link", { name: "POS" });
    expect(posLink.className).toContain("text-primary");
  });

  it("hides 'Historial' link for WAITER role", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: { email: "mesero@test.com" } as any,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(<Navbar />);

    expect(screen.getByText("POS")).toBeInTheDocument();
    expect(screen.getByText("Cocina")).toBeInTheDocument();
    expect(screen.queryByText("Historial")).not.toBeInTheDocument();
  });

  it("renders system name without OS suffix correctly", () => {
    vi.mocked(useTenant).mockReturnValue({
      system_name: "RestoApp",
      name: "RestoApp",
    } as any);

    render(<Navbar />);
    expect(screen.getByText("RESTOAPP")).toBeInTheDocument();
    expect(screen.queryByText("OS")).not.toBeInTheDocument();
  });

  it("renders correct role 'KITCHEN' for CHEF role", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: { email: "chef@test.com" } as any,
      role: "CHEF",
      isAdmin: false,
      isWaiter: false,
      isChef: true,
      isAuthenticated: true,
    });

    render(<Navbar />);
    const prompt = screen.getByTestId("push-notification-prompt");
    expect(prompt).toHaveAttribute("data-role", "KITCHEN");
  });

  it("updates email on authStateChange and unsubscribes on unmount", () => {
    const { unmount } = render(<Navbar />);

    expect(authStateCallback).toBeDefined();

    act(() => {
      authStateCallback?.("SIGNED_IN", {
        user: { email: "updated@test.com" },
      });
    });

    expect(screen.getByText("updated@test.com")).toBeInTheDocument();

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});

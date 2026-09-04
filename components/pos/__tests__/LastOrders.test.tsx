import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LastOrders from "../LastOrders";
import { useOptionalUser } from "@/components/UserProvider";

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
}));

describe("LastOrders Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Ver Historial Completo' link when user is not a waiter (e.g. ADMIN)", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isAuthenticated: true,
    });

    render(<LastOrders />);

    expect(screen.getByText("Últimas Órdenes")).toBeInTheDocument();
    const historyLink = screen.getByRole("link", { name: /Ver Historial Completo/i });
    expect(historyLink).toBeInTheDocument();
    expect(historyLink).toHaveAttribute("href", "/history");
  });

  it("renders 'Ver Historial Completo' link when user is null / undefined", () => {
    vi.mocked(useOptionalUser).mockReturnValue(null);

    render(<LastOrders />);

    expect(screen.getByText("Últimas Órdenes")).toBeInTheDocument();
    const historyLink = screen.getByRole("link", { name: /Ver Historial Completo/i });
    expect(historyLink).toBeInTheDocument();
  });

  it("hides 'Ver Historial Completo' link when user is WAITER", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(<LastOrders />);

    expect(screen.getByText("Últimas Órdenes")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver Historial Completo/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Ver Historial Completo")).not.toBeInTheDocument();
  });
});

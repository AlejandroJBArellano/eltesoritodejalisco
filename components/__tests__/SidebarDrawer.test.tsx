import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarDrawer } from "../SidebarDrawer";
import { usePathname } from "next/navigation";
import { useOptionalUser } from "@/components/UserProvider";
import { useTenant } from "@/components/TenantProvider";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@/components/TenantProvider", () => ({
  useTenant: vi.fn(),
}));

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
}));

describe("SidebarDrawer Component", () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useTenant).mockReturnValue({
      system_name: "KittnOS",
      name: "Kittn",
      logo_url: "/custom-logo.svg",
    } as any);
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: {
        email: "admin@test.com",
        full_name: "Admin User",
        role: "ADMIN",
      } as any,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isInventory: false,
      isAuthenticated: true,
      hasPermission: vi.fn().mockReturnValue(true),
    });
  });

  it("returns null when isOpen is false", () => {
    const { container } = render(
      <SidebarDrawer isOpen={false} onClose={onCloseMock} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders drawer panel and all groups when isOpen is true for ADMIN", () => {
    render(<SidebarDrawer isOpen={true} onClose={onCloseMock} />);

    expect(screen.getByText("Menú Principal")).toBeInTheDocument();
    expect(screen.getByText("KittnOS")).toBeInTheDocument();
    expect(screen.getByText("Panel de Inicio")).toBeInTheDocument();

    // Groups
    expect(screen.getByText("Operación Diaria")).toBeInTheDocument();
    expect(screen.getByText("Gestión de Equipo")).toBeInTheDocument();
    expect(screen.getByText("Catálogo y Clientes")).toBeInTheDocument();
    expect(screen.getByText("Finanzas y Reportes")).toBeInTheDocument();
    expect(screen.getAllByText("Configuración").length).toBeGreaterThanOrEqual(1);

    // Key links
    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();
    expect(screen.getByText("Monitor de Cocina")).toBeInTheDocument();
    expect(screen.getByText("Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Tareas")).toBeInTheDocument();
    expect(screen.getByText("Colaboradores y Roles")).toBeInTheDocument();
    expect(screen.getByText("Gestión de Horarios")).toBeInTheDocument();
    expect(screen.getByText("Historial de Tareas")).toBeInTheDocument();
    expect(screen.getByText("Gestión de Menú")).toBeInTheDocument();
    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Kittn Portal")).toBeInTheDocument();
    expect(screen.getByText("Reportes de Ventas")).toBeInTheDocument();
    expect(screen.getByText("Control de Gastos")).toBeInTheDocument();
    expect(screen.getByText("Historial de Órdenes")).toBeInTheDocument();
    expect(screen.getByText("Detector de Horas Pico")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<SidebarDrawer isOpen={true} onClose={onCloseMock} />);

    const backdrop = screen.getByTestId("sidebar-backdrop");
    fireEvent.click(backdrop);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    render(<SidebarDrawer isOpen={true} onClose={onCloseMock} />);

    const closeBtn = screen.getByTestId("sidebar-close-button");
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    render(<SidebarDrawer isOpen={true} onClose={onCloseMock} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when a navigation link is clicked", () => {
    render(<SidebarDrawer isOpen={true} onClose={onCloseMock} />);

    const posLink = screen.getByText("Punto de Venta");
    fireEvent.click(posLink);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("renders default logo when tenant logo_url is not provided", () => {
    vi.mocked(useTenant).mockReturnValue({
      system_name: "",
      name: "",
      logo_url: null,
    } as any);

    render(<SidebarDrawer isOpen={true} onClose={onCloseMock} />);
    expect(screen.getByText("KITTNOS")).toBeInTheDocument();
  });

  it("restricts links for WAITER role", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: {
        email: "waiter@test.com",
        full_name: "",
        role: "WAITER",
      } as any,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isInventory: false,
      isAuthenticated: true,
      hasPermission: vi.fn((p) => p === "pos.view" || p === "customers.view"),
    });

    render(<SidebarDrawer isOpen={true} onClose={onCloseMock} />);

    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();
    expect(screen.getByText("Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Tareas")).toBeInTheDocument();
    expect(screen.queryByText("Colaboradores y Roles")).not.toBeInTheDocument();
    expect(screen.queryByText("Configuración")).not.toBeInTheDocument();
  });

  it("highlights active link properly", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/users/list");
    render(<SidebarDrawer isOpen={true} onClose={onCloseMock} />);

    const teamLink = screen.getByText("Colaboradores y Roles").closest("a");
    expect(teamLink?.className).toContain("text-primary");
  });
});

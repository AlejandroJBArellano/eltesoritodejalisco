import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminUsersSubnav } from "../AdminUsersSubnav";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

describe("AdminUsersSubnav Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all navigation tabs", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/users/list");
    render(<AdminUsersSubnav />);

    expect(screen.getByText("Colaboradores y Roles")).toBeInTheDocument();
    expect(screen.getByText("Horarios y Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Control de Tareas")).toBeInTheDocument();
  });

  it("highlights 'Colaboradores y Roles' tab when on /admin/users/list", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/users/list");
    render(<AdminUsersSubnav />);

    const link = screen.getByRole("link", { name: /colaboradores y roles/i });
    expect(link.className).toContain("text-primary");
  });

  it("highlights 'Horarios y Asistencia' tab when on /admin/users/horarios", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/users/horarios");
    render(<AdminUsersSubnav />);

    const link = screen.getByRole("link", { name: /horarios y asistencia/i });
    expect(link.className).toContain("text-primary");
  });

  it("highlights 'Control de Tareas' tab when on /admin/users/tareas", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/users/tareas");
    render(<AdminUsersSubnav />);

    const link = screen.getByRole("link", { name: /control de tareas/i });
    expect(link.className).toContain("text-primary");
  });
});

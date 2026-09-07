import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminUsersContent, type Profile } from "../AdminUsersContent";
import * as actions from "@/app/admin/users/actions";

vi.mock("@/app/admin/users/actions", () => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserPin: vi.fn(),
}));

const mockProfiles: Profile[] = [
  {
    id: "usr-1",
    email: "admin@test.com",
    full_name: "Admin User",
    role: "ADMIN",
    created_at: "2026-01-01T00:00:00Z",
    pin: "1234",
  },
  {
    id: "usr-2",
    email: "manager@test.com",
    full_name: "Manager User",
    role: "MANAGER",
    created_at: "2026-01-02T00:00:00Z",
    pin: "5678",
  },
  {
    id: "usr-3",
    email: "waiter@test.com",
    full_name: "Waiter User",
    role: "WAITER",
    created_at: "2026-01-03T00:00:00Z",
    pin: null,
  },
];

describe("AdminUsersContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders profiles table and displays PIN badges only for ADMIN and MANAGER", () => {
    render(<AdminUsersContent initialProfiles={mockProfiles} />);

    expect(screen.getByText("Admin User")).toBeDefined();
    expect(screen.getByText("Manager User")).toBeDefined();
    expect(screen.getByText("Waiter User")).toBeDefined();

    // PIN badges for admin and manager
    expect(screen.getByText("1234")).toBeDefined();
    expect(screen.getByText("5678")).toBeDefined();

    // Only 2 PIN configure buttons should exist
    const pinButtons = screen.getAllByTitle("Configurar PIN de Autorización");
    expect(pinButtons).toHaveLength(2);
  });

  it("opens PIN edit modal, validates length and calls updateUserPin on submit", async () => {
    vi.mocked(actions.updateUserPin).mockResolvedValue({ success: true } as any);

    render(<AdminUsersContent initialProfiles={mockProfiles} />);

    const pinButtons = screen.getAllByTitle("Configurar PIN de Autorización");
    fireEvent.click(pinButtons[0]);

    expect(screen.getByText(/PIN de Autorización - Admin User/i)).toBeDefined();

    const pinInput = screen.getByPlaceholderText("••••");
    // Invalid PIN (< 4 digits)
    fireEvent.change(pinInput, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar PIN/i }));

    expect(
      screen.getByText("El PIN debe contener entre 4 y 6 dígitos numéricos")
    ).toBeDefined();
    expect(actions.updateUserPin).not.toHaveBeenCalled();

    // Valid PIN
    fireEvent.change(pinInput, { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar PIN/i }));

    await waitFor(() => {
      expect(actions.updateUserPin).toHaveBeenCalledWith("usr-1", "9999");
    });
  });
});

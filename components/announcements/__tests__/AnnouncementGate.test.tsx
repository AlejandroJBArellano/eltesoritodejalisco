import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { AnnouncementGate } from "../AnnouncementGate";
import { UserProvider, type UserProfile } from "@/components/UserProvider";

const baseProfile = {
  id: "u1",
  email: "a@b.c",
  full_name: "Ana",
  role_id: null,
  tenant_id: "t1",
  updated_at: null,
  pin: null,
} as unknown as UserProfile;

const renderGate = (profile: Partial<UserProfile> & Record<string, unknown>) =>
  render(
    <UserProvider initialProfile={{ ...baseProfile, ...profile } as UserProfile}>
      <AnnouncementGate />
    </UserProvider>,
  );

describe("AnnouncementGate", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the pending announcement and hides it after accepting", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ seen: {} }) });
    vi.stubGlobal("fetch", fetchMock);
    renderGate({ role: "ADMIN", seen_announcements: {} });

    expect(
      screen.getByRole("dialog", { name: "¡Ya puedes crear platillos personalizados!" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/announcements/seen",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "customization-v1" }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("the CTA marks it as seen and navigates (only with the permission)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ seen: {} }) }),
    );
    renderGate({ role: "ADMIN", seen_announcements: {} });
    fireEvent.click(screen.getByRole("button", { name: "Configurar en Menú" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/menu"));
  });

  it("waiters see it without the configuration CTA", () => {
    renderGate({ role: "WAITER", seen_announcements: {} });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Configurar en Menú" })).not.toBeInTheDocument();
  });

  it("does not render once seen", () => {
    renderGate({
      role: "ADMIN",
      seen_announcements: { "customization-v1": "2026-11-14T00:00:00Z" },
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the modal open with an error if saving fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "No se pudo guardar el anuncio" }) }),
    );
    renderGate({ role: "ADMIN", seen_announcements: {} });
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(
      await screen.findByText("No se pudo guardar el anuncio. Intenta de nuevo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

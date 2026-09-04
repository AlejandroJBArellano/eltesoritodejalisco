import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AsistenciaHistoryContent } from "../AsistenciaHistoryContent";

describe("AsistenciaHistoryContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders filter bar, summary KPIs and history table seamlessly", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/history")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            attendances: [
              {
                id: "att-1",
                user_id: "u-1",
                date: "2026-09-03",
                check_in: "2026-09-03T15:00:00Z",
                check_out: "2026-09-03T23:00:00Z",
                status: "FINISHED",
                users: { id: "u-1", name: "Lucia Barista", role: "WAITER" },
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          users: [{ id: "u-1", name: "Lucia Barista", role: "WAITER" }],
        }),
      });
    });

    render(<AsistenciaHistoryContent />);

    expect(screen.getByText("Filtros del Historial")).toBeInTheDocument();
    expect(screen.getByText("Horas Totales Trabajadas")).toBeInTheDocument();
    expect(await screen.findByText("Lucia Barista")).toBeInTheDocument();
  });
});

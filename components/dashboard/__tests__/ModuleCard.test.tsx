import { render, screen } from "@testing-library/react";
import { Receipt, ShoppingBag } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ModuleCard } from "../ModuleCard";

describe("ModuleCard Component", () => {
  it("renders title and link with standard href", () => {
    render(
      <ModuleCard
        title="Punto de Venta"
        href="/pos"
        icon={Receipt}
        themeClass="bg-dark/40 text-secondary"
        hoverColor="var(--color-secondary)"
      />,
    );

    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/pos");
    expect(link).not.toHaveAttribute("target");
  });

  it("renders external target with rel when target is _blank", () => {
    render(
      <ModuleCard
        title="Kittn Pickup"
        href="https://mi-restaurante.trykittn.com"
        target="_blank"
        icon={ShoppingBag}
        themeClass="bg-emerald-500/10 text-emerald-400"
        hoverColor="#10b981"
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
  });
});

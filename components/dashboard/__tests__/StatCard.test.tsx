import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { StatCard } from "../StatCard";

describe("StatCard Component", () => {
  it("renders title, formatted value, and icon with themeClass", () => {
    render(
      <StatCard
        title="Clientes Activos"
        icon={Users}
        value={152}
        themeClass="bg-success/10 text-success"
      />,
    );

    expect(screen.getByText("Clientes Activos")).toBeInTheDocument();
    expect(screen.getByText("152")).toBeInTheDocument();
  });
});

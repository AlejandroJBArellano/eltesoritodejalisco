import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GastosPagination } from "../GastosPagination";

describe("GastosPagination Component", () => {
  it("renders page info and controls correctly", () => {
    render(
      <GastosPagination
        currentPage={2}
        totalPages={5}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Filas por página:")).toBeInTheDocument();
    expect(screen.getByText(/^Página/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("disables previous button on first page and enables next button", () => {
    const onPageChange = vi.fn();
    render(
      <GastosPagination
        currentPage={1}
        totalPages={3}
        pageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    const prevBtn = screen.getByLabelText("Página anterior");
    const nextBtn = screen.getByLabelText("Página siguiente");

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables next button on last page and enables previous button", () => {
    const onPageChange = vi.fn();
    render(
      <GastosPagination
        currentPage={3}
        totalPages={3}
        pageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    const prevBtn = screen.getByLabelText("Página anterior");
    const nextBtn = screen.getByLabelText("Página siguiente");

    expect(nextBtn).toBeDisabled();
    expect(prevBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("handles page size changes", () => {
    const onPageSizeChange = vi.fn();
    render(
      <GastosPagination
        currentPage={1}
        totalPages={3}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    const pageSizeSelect = screen.getByLabelText("Filas por página");
    fireEvent.change(pageSizeSelect, { target: { value: "25" } });

    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });
});

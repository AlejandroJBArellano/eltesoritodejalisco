import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryModal } from "../CategoryModal";
import { useMenuCategories } from "../../hooks/useMenuCategories";
import { useMenuItems } from "../../hooks/useMenuItems";

vi.mock("../../hooks/useMenuCategories", () => ({
  useMenuCategories: vi.fn(),
}));

vi.mock("../../hooks/useMenuItems", () => ({
  useMenuItems: vi.fn(),
}));

describe("CategoryModal", () => {
  const mockSetIsCategoryModalOpen = vi.fn();
  const mockHandleCategorySubmit = vi.fn();
  const mockSetCategoryForm = vi.fn();
  const mockHandleFormChange = vi.fn();

  const defaultCategoryForm = {
    id: "",
    name: "",
    nameEn: "",
    showInPickup: false,
  };

  const defaultMockCategoriesState = {
    isCategoryModalOpen: true,
    setIsCategoryModalOpen: mockSetIsCategoryModalOpen,
    handleCategorySubmit: mockHandleCategorySubmit,
    categoryForm: defaultCategoryForm,
    categoryErrors: {},
    isSubmitting: false,
    setCategoryForm: mockSetCategoryForm,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMenuItems).mockReturnValue({
      handleFormChange: mockHandleFormChange,
    } as any);
    vi.mocked(useMenuCategories).mockReturnValue({
      ...defaultMockCategoriesState,
    } as any);
  });

  it("does not render when isOpen is false", () => {
    vi.mocked(useMenuCategories).mockReturnValue({
      ...defaultMockCategoriesState,
      isCategoryModalOpen: false,
    } as any);

    const { container } = render(<CategoryModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders creation modal correctly", () => {
    render(<CategoryModal />);

    expect(screen.getByText("Nueva Categoría")).toBeDefined();
    expect(screen.getByText("Guardar")).toBeDefined();
    expect(screen.getByPlaceholderText("Ej. ANTOJITOS")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. Snacks")).toBeDefined();
    expect(screen.getByLabelText("Mostrar en Kittn Pickup")).toBeDefined();
  });

  it("renders edit modal and updating state correctly", () => {
    vi.mocked(useMenuCategories).mockReturnValue({
      ...defaultMockCategoriesState,
      categoryForm: {
        id: "cat-1",
        name: "Bebidas",
        nameEn: "Drinks",
        showInPickup: true,
      },
      isSubmitting: false,
    } as any);

    render(<CategoryModal />);

    expect(screen.getByText("Editar Categoría")).toBeDefined();
    expect(screen.getByText("Actualizar")).toBeDefined();
  });

  it("renders submitting state with disabled button", () => {
    vi.mocked(useMenuCategories).mockReturnValue({
      ...defaultMockCategoriesState,
      isSubmitting: true,
    } as any);

    render(<CategoryModal />);

    const submitBtn = screen.getByRole("button", { name: "Guardando..." });
    expect(submitBtn).toBeDefined();
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("displays validation error when present", () => {
    vi.mocked(useMenuCategories).mockReturnValue({
      ...defaultMockCategoriesState,
      categoryErrors: {
        name: "El nombre es obligatorio",
      },
    } as any);

    render(<CategoryModal />);

    expect(screen.getByText("El nombre es obligatorio")).toBeDefined();
  });

  it("handles input changes for name, nameEn, and showInPickup", () => {
    render(<CategoryModal />);

    const nameInput = screen.getByPlaceholderText("Ej. ANTOJITOS");
    fireEvent.change(nameInput, { target: { value: "Postres" } });

    expect(mockSetCategoryForm).toHaveBeenCalled();
    const nameUpdater = mockSetCategoryForm.mock.calls[0][0];
    expect(nameUpdater({ name: "" })).toEqual({ name: "Postres" });

    const nameEnInput = screen.getByPlaceholderText("e.g. Snacks");
    fireEvent.change(nameEnInput, { target: { value: "Desserts" } });

    expect(mockSetCategoryForm).toHaveBeenCalledTimes(2);
    const nameEnUpdater = mockSetCategoryForm.mock.calls[1][0];
    expect(nameEnUpdater({ nameEn: "" })).toEqual({ nameEn: "Desserts" });

    const checkbox = screen.getByLabelText("Mostrar en Kittn Pickup");
    fireEvent.click(checkbox);

    expect(mockSetCategoryForm).toHaveBeenCalledTimes(3);
    const checkboxUpdater = mockSetCategoryForm.mock.calls[2][0];
    expect(checkboxUpdater({ showInPickup: false })).toEqual({
      showInPickup: true,
    });
  });

  it("handles close button click", () => {
    render(<CategoryModal />);

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);

    expect(mockSetIsCategoryModalOpen).toHaveBeenCalledWith(false);
  });

  it("submits the form and updates active form category if callback receives newName", () => {
    mockHandleCategorySubmit.mockImplementation((e, cb) => {
      e.preventDefault();
      cb("POSTRES");
    });

    render(<CategoryModal />);

    const submitBtn = screen.getByRole("button", { name: "Guardar" });
    fireEvent.click(submitBtn);

    expect(mockHandleCategorySubmit).toHaveBeenCalled();
    expect(mockHandleFormChange).toHaveBeenCalledWith("category", "POSTRES");
  });

  it("submits the form without updating active form if callback receives empty name", () => {
    mockHandleCategorySubmit.mockImplementation((e, cb) => {
      e.preventDefault();
      cb("");
    });

    render(<CategoryModal />);

    const submitBtn = screen.getByRole("button", { name: "Guardar" });
    fireEvent.click(submitBtn);

    expect(mockHandleCategorySubmit).toHaveBeenCalled();
    expect(mockHandleFormChange).not.toHaveBeenCalled();
  });
});

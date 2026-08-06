// Shared types for the Menu module
// -----------------------------------

export type Translations = Record<
  string,
  { name?: string; description?: string; category?: string }
>;

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit?: number | null;
  trackingType: "MEASURABLE" | "PIECE";
  createdAt: string;
  updatedAt: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  translations?: Translations;
  ingredientId?: string | null;
  show_in_dine_in?: boolean;
  show_in_takeaway?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  translations?: Translations;
  sort_order: number;
  is_active: boolean;
  show_in_pickup: boolean;
};

export type RecipeItem = {
  id: string;
  menuItemId: string;
  ingredientId: string;
  ingredientName?: string;
  quantityRequired: number;
};

export type SortField = "name" | "price" | "category" | "isAvailable";

export type MenuFormState = {
  id?: string;
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
  nameEn: string;
  descriptionEn: string;
  ingredientId: string;
  showInDineIn: boolean;
  showInTakeaway: boolean;
};

export type RecipeFormState = {
  ingredientId: string;
  quantityRequired: string;
};

export type CategoryFormState = {
  id?: string;
  name: string;
  nameEn: string;
  showInPickup: boolean;
};

export type IngredientFormState = {
  id?: string;
  name: string;
  unit: string;
  currentStock: string;
  minimumStock: string;
  costPerUnit: string;
  trackingType: "MEASURABLE" | "PIECE";
};

// API shape coming from Supabase before mapping
export interface DatabaseMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  is_available: boolean;
  image_url?: string | null;
  translations?: Translations;
  ingredient_id?: string | null;
  show_in_dine_in?: boolean;
  show_in_takeaway?: boolean;
}

// Default empty states
export const EMPTY_PRODUCT_FORM: MenuFormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  isAvailable: true,
  nameEn: "",
  descriptionEn: "",
  ingredientId: "",
  showInDineIn: true,
  showInTakeaway: true,
};

export const EMPTY_CATEGORY_FORM: CategoryFormState = {
  name: "",
  nameEn: "",
  showInPickup: true,
};

export const EMPTY_INGREDIENT_FORM: IngredientFormState = {
  name: "",
  unit: "unit",
  currentStock: "0",
  minimumStock: "0",
  costPerUnit: "",
  trackingType: "MEASURABLE",
};

export const EMPTY_RECIPE_FORM: RecipeFormState = {
  ingredientId: "",
  quantityRequired: "",
};

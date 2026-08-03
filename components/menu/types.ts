// Shared types for the Menu module
// -----------------------------------

export type Translations = Record<
  string,
  { name?: string; description?: string; category?: string }
>;

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
};

export type MenuCategory = {
  id: string;
  name: string;
  translations?: Translations;
  sort_order: number;
  is_active: boolean;
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
};

export type RecipeFormState = {
  ingredientId: string;
  quantityRequired: string;
};

export type CategoryFormState = {
  id?: string;
  name: string;
  nameEn: string;
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
};

export const EMPTY_CATEGORY_FORM: CategoryFormState = {
  name: "",
  nameEn: "",
};

export const EMPTY_RECIPE_FORM: RecipeFormState = {
  ingredientId: "",
  quantityRequired: "",
};

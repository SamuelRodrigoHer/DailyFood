export type MealType = 'desayuno' | 'almuerzo' | 'merienda' | 'cena';

export type ShoppingCategory =
  | 'Frutas y Verduras'
  | 'Lácteos y Huevos'
  | 'Carnes y Pescados'
  | 'Panadería y Cereales'
  | 'Despensa y Pasta'
  | 'Congelados'
  | 'Bebidas'
  | 'Limpieza y Hogar'
  | 'Otros';

export interface Ingredient {
  id?: string;
  name: string;
  quantity?: string;
  category?: ShoppingCategory;
}

export interface Recipe {
  id: string;
  user_id?: string;
  name: string;
  category: MealType;
  ingredients: Ingredient[];
  notes?: string;
  created_at?: string;
}

export interface MealPlanItem {
  id: string;
  user_id?: string;
  date: string; // Formato YYYY-MM-DD
  meal_type: MealType;
  title: string;
  recipe_id?: string;
  notes?: string;
}

export interface ShoppingItem {
  id: string;
  user_id?: string;
  name: string;
  category: ShoppingCategory;
  quantity?: string;
  is_bought: boolean;
  notes?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  created_at?: string;
}

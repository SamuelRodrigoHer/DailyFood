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
  household_id?: string;
  name: string;
  category: MealType;
  ingredients: Ingredient[];
  notes?: string;
  created_at?: string;
}

export type BookStatus = 'want_to_read' | 'reading' | 'read';

export interface Book {
  id: string;
  user_id?: string;
  household_id?: string | null;
  title: string;
  author: string;
  status: BookStatus;
  rating?: number;
  page_count?: number;
  current_page?: number;
  cover_url?: string;
  notes?: string;
  created_at?: string;
}

export interface MealPlanItem {
  id: string;
  user_id?: string;
  household_id?: string;
  date: string; // Formato YYYY-MM-DD
  meal_type: MealType;
  title: string;
  recipe_id?: string;
  notes?: string;
}

export interface ShoppingItem {
  id: string;
  user_id?: string;
  household_id?: string;
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

export interface GymExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight_kg?: number;
  set_details?: GymSet[];
  notes?: string;
}

export interface GymSet {
  id: string;
  reps: number;
  weight_kg?: number;
  completed?: boolean;
}

export interface GymLibraryExercise {
  id: string;
  user_id?: string;
  name: string;
  muscle_group?: string;
  equipment?: string;
  default_sets: number;
  default_reps: number;
  default_weight_kg?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface GymRoutine {
  id: string;
  user_id?: string;
  name: string;
  notes?: string;
  exercises: GymExercise[];
  created_at: string;
  updated_at?: string;
}

export interface GymSession {
  id: string;
  user_id?: string;
  routine_id?: string;
  name: string;
  performed_on: string;
  duration_minutes?: number;
  notes?: string;
  exercises: GymExercise[];
  created_at: string;
}

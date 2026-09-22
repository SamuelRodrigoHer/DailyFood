'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Recipe, MealPlanItem, ShoppingItem, ShoppingCategory, MealType } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_SHOPPING_ITEMS } from '@/lib/constants';
import { guessShoppingCategory } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UserSession {
  id: string;
  email: string;
}

interface AppContextType {
  user: UserSession | null;
  isSupabaseConnected: boolean;
  isRealtimeActive: boolean;
  isLoading: boolean;
  recipes: Recipe[];
  mealPlans: MealPlanItem[];
  shoppingItems: ShoppingItem[];
  
  // Acciones de autenticación
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string) => Promise<{ error?: string; message?: string }>;
  logout: () => Promise<void>;
  
  // Acciones de recetas
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  
  // Acciones de planificador
  setMealPlan: (date: string, mealType: MealType, title: string, recipeId?: string, notes?: string) => Promise<void>;
  removeMealPlan: (id: string) => Promise<void>;
  clearWeekMeals: (dateStrings: string[]) => Promise<void>;
  copyWeekMeals: (fromDates: string[], toDates: string[]) => Promise<void>;
  autoFillWeekMeals: (dateStrings: string[]) => Promise<number>;
  
  // Acciones de lista de la compra
  addShoppingItem: (name: string, category?: ShoppingCategory, quantity?: string) => Promise<void>;
  toggleShoppingItem: (id: string) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  clearBoughtItems: () => Promise<void>;
  addIngredientsToShopping: (ingredients: { name: string; quantity?: string; category?: ShoppingCategory }[]) => Promise<number>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);

  const supabase = createClient();

  // 1. Cargar estado inicial y suscribir a WebSockets (Realtime)
  useEffect(() => {
    let realtimeChannel: RealtimeChannel | null = null;

    async function init() {
      setIsLoading(true);

      if (supabase) {
        setIsSupabaseConnected(true);

        // Comprobar sesión de usuario activa
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          await loadSharedSupabaseData();
        } else {
          loadLocalData();
        }

        // Suscripción a cambios de sesión de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            await loadSharedSupabaseData();
          } else {
            setUser(null);
            loadLocalData();
          }
        });

        // ==============================================================
        // CONFIGURACIÓN DE WEBSOCKETS EN TIEMPO REAL (SUPABASE REALTIME)
        // ==============================================================
        const channelName = `shared-home-${Date.now()}`;
        realtimeChannel = supabase
          .channel(channelName)
          // A) Cambios en la lista de la compra
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'shopping_items' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newItem = payload.new as ShoppingItem;
                setShoppingItems((prev) => {
                  if (prev.some((item) => item.id === newItem.id)) return prev;
                  return [newItem, ...prev];
                });
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as ShoppingItem;
                setShoppingItems((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                );
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id: string }).id;
                setShoppingItems((prev) => prev.filter((item) => item.id !== deletedId));
              }
            }
          )
          // B) Cambios en el menú semanal
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'meal_plans' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newMeal = payload.new as MealPlanItem;
                setMealPlans((prev) => {
                  const filtered = prev.filter(
                    (m) => !(m.date === newMeal.date && m.meal_type === newMeal.meal_type)
                  );
                  return [...filtered, newMeal];
                });
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as MealPlanItem;
                setMealPlans((prev) =>
                  prev.map((m) => (m.id === updated.id ? updated : m))
                );
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id: string }).id;
                setMealPlans((prev) => prev.filter((m) => m.id !== deletedId));
              }
            }
          )
          // C) Cambios en recetas compartidas
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'recipes' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newRec = payload.new as Recipe;
                setRecipes((prev) => {
                  if (prev.some((r) => r.id === newRec.id)) return prev;
                  return [newRec, ...prev];
                });
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as Recipe;
                setRecipes((prev) =>
                  prev.map((r) => (r.id === updated.id ? updated : r))
                );
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id: string }).id;
                setRecipes((prev) => prev.filter((r) => r.id !== deletedId));
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsRealtimeActive(true);
            }
          });

        setIsLoading(false);

        return () => {
          subscription.unsubscribe();
          if (realtimeChannel) supabase.removeChannel(realtimeChannel);
        };
      } else {
        setIsSupabaseConnected(false);
        loadLocalData();
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Cargar datos locales desde localStorage
  const loadLocalData = () => {
    if (typeof window === 'undefined') return;

    const storedRecipes = localStorage.getItem('app_recipes');
    const storedMeals = localStorage.getItem('app_meals');
    const storedShopping = localStorage.getItem('app_shopping');

    if (storedRecipes) {
      try { setRecipes(JSON.parse(storedRecipes)); } catch { setRecipes(INITIAL_RECIPES); }
    } else {
      setRecipes(INITIAL_RECIPES);
      localStorage.setItem('app_recipes', JSON.stringify(INITIAL_RECIPES));
    }

    if (storedMeals) {
      try { setMealPlans(JSON.parse(storedMeals)); } catch { setMealPlans([]); }
    } else {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const defaultMeals: MealPlanItem[] = [
        { id: 'meal-1', date: today, meal_type: 'almuerzo', title: 'Lentejas con verduras', recipe_id: 'receta-1' },
        { id: 'meal-2', date: today, meal_type: 'cena', title: 'Salmón al horno con patatas panadera', recipe_id: 'receta-2' },
        { id: 'meal-3', date: tomorrow, meal_type: 'almuerzo', title: 'Pasta al pesto con cherrys y burrata', recipe_id: 'receta-3' },
      ];
      setMealPlans(defaultMeals);
      localStorage.setItem('app_meals', JSON.stringify(defaultMeals));
    }

    if (storedShopping) {
      try { setShoppingItems(JSON.parse(storedShopping)); } catch { setShoppingItems(INITIAL_SHOPPING_ITEMS); }
    } else {
      setShoppingItems(INITIAL_SHOPPING_ITEMS);
      localStorage.setItem('app_shopping', JSON.stringify(INITIAL_SHOPPING_ITEMS));
    }
  };

  // Cargar datos COMPARTIDOS desde Supabase (accesibles por todos los miembros autenticados)
  const loadSharedSupabaseData = async () => {
    if (!supabase) return;

    try {
      const [recipesRes, mealsRes, shoppingRes] = await Promise.all([
        supabase.from('recipes').select('*').order('created_at', { ascending: false }),
        supabase.from('meal_plans').select('*').order('date', { ascending: true }),
        supabase.from('shopping_items').select('*').order('created_at', { ascending: false }),
      ]);

      if (recipesRes.data && recipesRes.data.length > 0) {
        setRecipes(recipesRes.data);
      } else {
        // Inicializar con recetas por defecto si la base de datos está vacía
        for (const r of INITIAL_RECIPES) {
          await supabase.from('recipes').upsert({
            id: r.id,
            name: r.name,
            category: r.category,
            ingredients: r.ingredients,
            notes: r.notes,
          });
        }
        setRecipes(INITIAL_RECIPES);
      }

      if (mealsRes.data) setMealPlans(mealsRes.data);
      if (shoppingRes.data) setShoppingItems(shoppingRes.data);
    } catch (err) {
      console.error('Error cargando datos compartidos de Supabase:', err);
      loadLocalData();
    }
  };

  // Guardar en localStorage cuando se esté en modo offline/local
  const saveLocal = (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // -------------------------------------------------------------
  // AUTENTICACIÓN
  // -------------------------------------------------------------
  const login = async (email: string, pass: string) => {
    if (!supabase) {
      setUser({ id: 'demo-user-123', email });
      return {};
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email || '' });
      await loadSharedSupabaseData();
    }
    return {};
  };

  const signUp = async (email: string, pass: string) => {
    if (!supabase) {
      setUser({ id: 'demo-user-123', email });
      return { message: 'Modo local activo.' };
    }

    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (error) return { error: error.message };
    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email || '' });
      await loadSharedSupabaseData();
    }
    return { message: 'Cuenta creada correctamente.' };
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  // -------------------------------------------------------------
  // GESTIÓN DE RECETAS (COMPARTIDAS EN TIEMPO REAL)
  // -------------------------------------------------------------
  const addRecipe = async (recipeData: Omit<Recipe, 'id'>) => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: crypto.randomUUID(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };

    setRecipes((prev) => {
      const updated = [newRecipe, ...prev];
      if (!user || !supabase) saveLocal('app_recipes', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('recipes').insert(newRecipe);
    }
  };

  const updateRecipe = async (updatedRecipe: Recipe) => {
    setRecipes((prev) => {
      const updated = prev.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r));
      if (!user || !supabase) saveLocal('app_recipes', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('recipes').update(updatedRecipe).eq('id', updatedRecipe.id);
    }
  };

  const deleteRecipe = async (id: string) => {
    setRecipes((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      if (!user || !supabase) saveLocal('app_recipes', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('recipes').delete().eq('id', id);
    }
  };

  // -------------------------------------------------------------
  // GESTIÓN DEL PLANIFICADOR DE COMIDAS (COMPARTIDO EN TIEMPO REAL)
  // -------------------------------------------------------------
  const setMealPlan = async (
    date: string,
    mealType: MealType,
    title: string,
    recipeId?: string,
    notes?: string
  ) => {
    const existing = mealPlans.find((m) => m.date === date && m.meal_type === mealType);

    const mealItem: MealPlanItem = {
      id: existing ? existing.id : crypto.randomUUID(),
      user_id: user?.id,
      date,
      meal_type: mealType,
      title,
      recipe_id: recipeId,
      notes,
    };

    setMealPlans((prev) => {
      const filtered = prev.filter((m) => !(m.date === date && m.meal_type === mealType));
      const updated = [...filtered, mealItem];
      if (!user || !supabase) saveLocal('app_meals', updated);
      return updated;
    });

    if (supabase && user) {
      if (existing) {
        await supabase.from('meal_plans').update(mealItem).eq('id', mealItem.id);
      } else {
        await supabase.from('meal_plans').insert(mealItem);
      }
    }
  };

  const removeMealPlan = async (id: string) => {
    setMealPlans((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      if (!user || !supabase) saveLocal('app_meals', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('meal_plans').delete().eq('id', id);
    }
  };

  const clearWeekMeals = async (dateStrings: string[]) => {
    setMealPlans((prev) => {
      const updated = prev.filter((m) => !dateStrings.includes(m.date));
      if (!user || !supabase) saveLocal('app_meals', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('meal_plans').delete().in('date', dateStrings);
    }
  };

  const copyWeekMeals = async (fromDates: string[], toDates: string[]) => {
    const newItems: MealPlanItem[] = [];

    fromDates.forEach((fromDate, index) => {
      const toDate = toDates[index];
      if (!toDate) return;

      const mealsOnDay = mealPlans.filter((m) => m.date === fromDate);
      mealsOnDay.forEach((meal) => {
        newItems.push({
          id: crypto.randomUUID(),
          user_id: user?.id,
          date: toDate,
          meal_type: meal.meal_type,
          title: meal.title,
          recipe_id: meal.recipe_id,
          notes: meal.notes,
        });
      });
    });

    if (newItems.length === 0) return;

    setMealPlans((prev) => {
      // Reemplazamos las comidas que ya hubiera en los días destino
      const filtered = prev.filter((m) => !toDates.includes(m.date));
      const updated = [...filtered, ...newItems];
      if (!user || !supabase) saveLocal('app_meals', updated);
      return updated;
    });

    if (supabase && user) {
      // Eliminar las que hubiera en destino e insertar las nuevas
      await supabase.from('meal_plans').delete().in('date', toDates);
      await supabase.from('meal_plans').insert(newItems);
    }
  };

  const autoFillWeekMeals = async (dateStrings: string[]): Promise<number> => {
    if (recipes.length === 0) return 0;

    const newItems: MealPlanItem[] = [];

    const lunches = recipes.filter((r) => r.category === 'almuerzo');
    const dinners = recipes.filter((r) => r.category === 'cena');

    dateStrings.forEach((date) => {
      // Almuerzo
      const hasLunch = mealPlans.some((m) => m.date === date && m.meal_type === 'almuerzo');
      if (!hasLunch) {
        const pool = lunches.length > 0 ? lunches : recipes;
        const randomRecipe = pool[Math.floor(Math.random() * pool.length)];
        newItems.push({
          id: crypto.randomUUID(),
          user_id: user?.id,
          date,
          meal_type: 'almuerzo',
          title: randomRecipe.name,
          recipe_id: randomRecipe.id,
        });
      }

      // Cena
      const hasDinner = mealPlans.some((m) => m.date === date && m.meal_type === 'cena');
      if (!hasDinner) {
        const pool = dinners.length > 0 ? dinners : recipes;
        const randomRecipe = pool[Math.floor(Math.random() * pool.length)];
        newItems.push({
          id: crypto.randomUUID(),
          user_id: user?.id,
          date,
          meal_type: 'cena',
          title: randomRecipe.name,
          recipe_id: randomRecipe.id,
        });
      }
    });

    if (newItems.length === 0) return 0;

    setMealPlans((prev) => {
      const updated = [...prev, ...newItems];
      if (!user || !supabase) saveLocal('app_meals', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('meal_plans').insert(newItems);
    }

    return newItems.length;
  };

  // -------------------------------------------------------------
  // GESTIÓN DE LA LISTA DE LA COMPRA (COMPARTIDA EN TIEMPO REAL)
  // -------------------------------------------------------------
  const addShoppingItem = async (name: string, category?: ShoppingCategory, quantity?: string) => {
    if (!name.trim()) return;

    const detectedCategory = category || guessShoppingCategory(name);
    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      user_id: user?.id,
      name: name.trim(),
      category: detectedCategory,
      quantity: quantity?.trim() || undefined,
      is_bought: false,
      created_at: new Date().toISOString(),
    };

    setShoppingItems((prev) => {
      const updated = [newItem, ...prev];
      if (!user || !supabase) saveLocal('app_shopping', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('shopping_items').insert(newItem);
    }
  };

  const toggleShoppingItem = async (id: string) => {
    let targetItem: ShoppingItem | undefined;

    setShoppingItems((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          targetItem = { ...item, is_bought: !item.is_bought };
          return targetItem;
        }
        return item;
      });
      if (!user || !supabase) saveLocal('app_shopping', updated);
      return updated;
    });

    if (supabase && user && targetItem) {
      await supabase.from('shopping_items').update({ is_bought: targetItem.is_bought }).eq('id', id);
    }
  };

  const deleteShoppingItem = async (id: string) => {
    setShoppingItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (!user || !supabase) saveLocal('app_shopping', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('shopping_items').delete().eq('id', id);
    }
  };

  const clearBoughtItems = async () => {
    setShoppingItems((prev) => {
      const updated = prev.filter((item) => !item.is_bought);
      if (!user || !supabase) saveLocal('app_shopping', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('shopping_items').delete().eq('is_bought', true);
    }
  };

  const addIngredientsToShopping = async (
    ingredients: { name: string; quantity?: string; category?: ShoppingCategory }[]
  ): Promise<number> => {
    if (!ingredients.length) return 0;

    const newItems: ShoppingItem[] = ingredients.map((ing) => ({
      id: crypto.randomUUID(),
      user_id: user?.id,
      name: ing.name.trim(),
      quantity: ing.quantity,
      category: ing.category || guessShoppingCategory(ing.name),
      is_bought: false,
      created_at: new Date().toISOString(),
    }));

    setShoppingItems((prev) => {
      const updated = [...newItems, ...prev];
      if (!user || !supabase) saveLocal('app_shopping', updated);
      return updated;
    });

    if (supabase && user) {
      await supabase.from('shopping_items').insert(newItems);
    }

    return newItems.length;
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isSupabaseConnected,
        isRealtimeActive,
        isLoading,
        recipes,
        mealPlans,
        shoppingItems,
        login,
        signUp,
        logout,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        setMealPlan,
        removeMealPlan,
        clearWeekMeals,
        copyWeekMeals,
        autoFillWeekMeals,
        addShoppingItem,
        toggleShoppingItem,
        deleteShoppingItem,
        clearBoughtItems,
        addIngredientsToShopping,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
}

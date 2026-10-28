'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Book, Recipe, MealPlanItem, ShoppingItem, ShoppingCategory, MealType } from '@/lib/types';
import { INITIAL_RECIPES, INITIAL_SHOPPING_ITEMS } from '@/lib/constants';
import { guessShoppingCategory } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UserSession {
  id: string;
  email: string;
  household_id?: string;
}

interface AppContextType {
  user: UserSession | null;
  isSupabaseConnected: boolean;
  isRealtimeActive: boolean;
  isLoading: boolean;
  books: Book[];
  bookError: string | null;
  reloadBooks: () => Promise<void>;
  recipes: Recipe[];
  mealPlans: MealPlanItem[];
  shoppingItems: ShoppingItem[];
  
  // Acciones de autenticación
  login: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string) => Promise<{ error?: string; message?: string }>;
  logout: () => Promise<void>;
  createHouseholdInvite: () => Promise<{ code?: string; error?: string }>;
  joinHousehold: (code: string) => Promise<{ error?: string }>;
  
  // Acciones de recetas
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;

  // Acciones de biblioteca de lecturas
  addBook: (book: Omit<Book, 'id'>) => Promise<void>;
  updateBook: (book: Book) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  
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
  const [bookError, setBookError] = useState<string | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);

  const supabase = createClient();

  // 1. Cargar estado inicial y suscribir a WebSockets (Realtime)
  useEffect(() => {
    let realtimeChannel: RealtimeChannel | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    let disposed = false;

    async function init() {
      setIsLoading(true);

      if (supabase) {
        setIsSupabaseConnected(true);

        // Comprobar sesión de usuario activa
        const { data: { session } } = await supabase.auth.getSession();
        if (disposed) return;
        if (session?.user) {
          const { data: householdId, error: householdError } = await supabase.rpc('my_household_id');
          setUser({ id: session.user.id, email: session.user.email || '', household_id: householdId || undefined });
          setBooks([]);
          setBookError(null);
          if (householdError) setBookError('No se pudo comprobar tu hogar. La biblioteca local no se mostrará para evitar mezclar cuentas.');
          else if (householdId) await loadSharedSupabaseData(householdId);
          else await loadPrivateBooks();
        } else {
          loadLocalData();
        }

        // Suscripción a cambios de sesión de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            setIsLoading(true);
            setBooks([]);
            setRecipes([]);
            setMealPlans([]);
            setShoppingItems([]);
            setBookError(null);
            const { data: householdId, error: householdError } = await supabase.rpc('my_household_id');
            if (disposed) return;
            setUser({ id: session.user.id, email: session.user.email || '', household_id: householdId || undefined });
            if (householdError) setBookError('No se pudo comprobar tu hogar. La biblioteca local no se mostrará para evitar mezclar cuentas.');
            else if (householdId) await loadSharedSupabaseData(householdId);
            else await loadPrivateBooks();
            if (!disposed) setIsLoading(false);
          } else {
            setUser(null);
            setBookError(null);
            loadLocalData();
            if (!disposed) setIsLoading(false);
          }
        });
        unsubscribeAuth = () => subscription.unsubscribe();

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
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'books' },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newBook = payload.new as Book;
                setBooks((prev) => prev.some((book) => book.id === newBook.id) ? prev : [newBook, ...prev]);
              } else if (payload.eventType === 'UPDATE') {
                const updated = payload.new as Book;
                setBooks((prev) => prev.map((book) => book.id === updated.id ? updated : book));
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id: string }).id;
                setBooks((prev) => prev.filter((book) => book.id !== deletedId));
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsRealtimeActive(true);
            }
          });

        if (!disposed) setIsLoading(false);
      } else {
        if (disposed) return;
        setIsSupabaseConnected(false);
        loadLocalData();
        setIsLoading(false);
      }
    }

    void init();
    return () => {
      disposed = true;
      unsubscribeAuth?.();
      if (supabase && realtimeChannel) void supabase.removeChannel(realtimeChannel);
    };
    // Auth listener owns this one-time initialization; including its render-local
    // helper would recreate subscriptions on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Cargar datos locales desde localStorage
  function loadLocalData() {
    if (typeof window === 'undefined') return;

    let storedRecipes: string | null;
    let storedBooks: string | null;
    let storedMeals: string | null;
    let storedShopping: string | null;
    try {
      storedRecipes = localStorage.getItem('app_recipes');
      storedBooks = localStorage.getItem('app_books');
      storedMeals = localStorage.getItem('app_meals');
      storedShopping = localStorage.getItem('app_shopping');
    } catch {
      setBooks([]);
      setBookError('El navegador no permite acceder al almacenamiento local. Actívalo para abrir tu biblioteca.');
      return;
    }

    setBookError(null);
    if (storedBooks) {
      try {
        const parsedBooks = JSON.parse(storedBooks);
        if (!Array.isArray(parsedBooks)) throw new Error('Formato de biblioteca no válido');
        setBooks(parsedBooks);
      } catch {
        setBooks([]);
        setBookError('No se pudo leer la biblioteca local porque sus datos están dañados.');
      }
    } else {
      setBooks([]);
    }

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
  }

  // Cargar únicamente los datos del hogar al que pertenece esta cuenta.
  async function loadSharedSupabaseData(householdId: string) {
    if (!supabase || !householdId) return;

    try {
      const [recipesRes, mealsRes, shoppingRes, booksRes] = await Promise.all([
        supabase.from('recipes').select('*').eq('household_id', householdId).order('created_at', { ascending: false }),
        supabase.from('meal_plans').select('*').eq('household_id', householdId).order('date', { ascending: true }),
        supabase.from('shopping_items').select('*').eq('household_id', householdId).order('created_at', { ascending: false }),
        supabase.from('books').select('*').or(`household_id.is.null,household_id.eq.${householdId}`).order('created_at', { ascending: false }),
      ]);

      if (recipesRes.error) console.error('Error cargando recetas compartidas:', recipesRes.error);
      setRecipes(recipesRes.data || []);
      setMealPlans(mealsRes.data || []);
      setShoppingItems(shoppingRes.data || []);
      if (booksRes.error) {
        setBooks([]);
        setBookError(`No se pudo cargar la biblioteca sincronizada: ${booksRes.error.message}. Ejecuta supabase/schema.sql para crear o actualizar la tabla de libros.`);
      } else {
        setBooks(booksRes.data || []);
        setBookError(null);
      }
    } catch (err) {
      console.error('Error cargando datos compartidos de Supabase:', err);
      setRecipes([]);
      setMealPlans([]);
      setShoppingItems([]);
      setBooks([]);
      setBookError(err instanceof Error ? `No se pudo acceder a la biblioteca: ${err.message}` : 'No se pudo acceder a la biblioteca sincronizada.');
    }
  }

  async function loadPrivateBooks() {
    if (!supabase) return;
    setBookError(null);
    try {
      const { data, error } = await supabase.from('books').select('*').is('household_id', null).order('created_at', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      setBooks([]);
      setBookError(error instanceof Error ? `No se pudo cargar la biblioteca personal: ${error.message}` : 'No se pudo cargar la biblioteca personal.');
    }
  }

  // Guardar en localStorage cuando se esté en modo offline/local
  const saveLocal = <T,>(key: string, data: T) => {
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
      const { data: householdId, error: householdError } = await supabase.rpc('my_household_id');
      if (householdError || !householdId) return { error: householdError?.message || 'No se encontró tu hogar.' };
      setUser({ id: data.user.id, email: data.user.email || '', household_id: householdId });
      await loadSharedSupabaseData(householdId);
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
    if (data.user && data.session) {
      const { data: householdId, error: householdError } = await supabase.rpc('my_household_id');
      if (householdError || !householdId) return { error: householdError?.message || 'No se pudo crear tu hogar.' };
      setUser({ id: data.user.id, email: data.user.email || '', household_id: householdId });
      await loadSharedSupabaseData(householdId);
    }
    return { message: 'Cuenta creada correctamente.' };
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const createHouseholdInvite = async () => {
    if (!supabase || !user?.household_id) return { error: 'Inicia sesión para invitar a alguien.' };
    const { data, error } = await supabase.rpc('create_household_invite');
    if (error) return { error: error.message };
    const invite = Array.isArray(data) ? data[0] : data;
    return invite?.invite_code
      ? { code: String(invite.invite_code) }
      : { error: 'No se pudo generar el código.' };
  };

  const joinHousehold = async (code: string) => {
    if (!supabase || !user) return { error: 'Inicia sesión para unirte a un hogar.' };
    const { data, error } = await supabase.rpc('join_household', { invite_code: code.trim() });
    if (error) return { error: error.message };
    const householdId = typeof data === 'string' ? data : String(data);
    setUser((current) => current ? { ...current, household_id: householdId } : current);
    await loadSharedSupabaseData(householdId);
    return {};
  };

  // -------------------------------------------------------------
  // GESTIÓN DE RECETAS (COMPARTIDAS EN TIEMPO REAL)
  // -------------------------------------------------------------
  const addRecipe = async (recipeData: Omit<Recipe, 'id'>) => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: crypto.randomUUID(),
      user_id: user?.id,
      household_id: user?.household_id,
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

  const addBook = async (bookData: Omit<Book, 'id'>) => {
    setBookError(null);
    const newBook: Book = {
      ...bookData,
      id: crypto.randomUUID(),
      user_id: user?.id,
      household_id: bookData.household_id === null ? null : (bookData.household_id || user?.household_id || null),
      created_at: new Date().toISOString(),
    };

    if (supabase && user) {
      if (newBook.household_id && newBook.household_id !== user.household_id) {
        const message = 'No puedes guardar este libro en un hogar al que no perteneces.';
        setBookError(message);
        throw new Error(message);
      }
      const { data, error } = await supabase.from('books').insert(newBook).select('*').single();
      if (error) {
        setBookError(`No se pudo guardar el libro: ${error.message}`);
        throw error;
      }
      setBooks((current) => [data as Book, ...current.filter((book) => book.id !== data.id)]);
      return;
    }

    try {
      const next = [newBook, ...books];
      saveLocal('app_books', next);
      setBooks(next);
    } catch (error) {
      setBookError('No se pudo guardar el libro en este dispositivo. Comprueba el espacio y los permisos del navegador.');
      throw error;
    }
  };

  const updateBook = async (book: Book) => {
    setBookError(null);
    if (supabase && user) {
      const { data, error } = await supabase.from('books').update({
        household_id: book.household_id || null,
        title: book.title,
        author: book.author,
        status: book.status,
        rating: book.rating ?? null,
        page_count: book.page_count ?? null,
        current_page: book.current_page ?? null,
        cover_url: book.cover_url || null,
        notes: book.notes || null,
      }).eq('id', book.id).select('*').single();
      if (error) {
        setBookError(`No se pudieron guardar los cambios: ${error.message}`);
        throw error;
      }
      setBooks((current) => current.map((item) => item.id === book.id ? data as Book : item));
      return;
    }

    try {
      const next = books.map((item) => item.id === book.id ? book : item);
      saveLocal('app_books', next);
      setBooks(next);
    } catch (error) {
      setBookError('No se pudieron guardar los cambios en este dispositivo. Comprueba el almacenamiento disponible.');
      throw error;
    }
  };

  const deleteBook = async (id: string) => {
    setBookError(null);
    if (supabase && user) {
      const { data, error } = await supabase.from('books').delete().eq('id', id).select('id').single();
      if (error) {
        setBookError(`No se pudo eliminar el libro: ${error.message}`);
        throw error;
      }
      if (!data) throw new Error('El libro ya no existe o no tienes permiso para eliminarlo.');
      setBooks((current) => current.filter((book) => book.id !== id));
      return;
    }

    try {
      const next = books.filter((book) => book.id !== id);
      saveLocal('app_books', next);
      setBooks(next);
    } catch (error) {
      setBookError('No se pudo eliminar el libro local. Comprueba los permisos del navegador.');
      throw error;
    }
  };

  const reloadBooks = async () => {
    setIsLoading(true);
    try {
      if (supabase && user) {
        if (user.household_id) await loadSharedSupabaseData(user.household_id);
        else await loadPrivateBooks();
      } else {
        loadLocalData();
      }
    } finally {
      setIsLoading(false);
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
      household_id: user?.household_id,
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
          household_id: user?.household_id,
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
          household_id: user?.household_id,
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
          household_id: user?.household_id,
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
      household_id: user?.household_id,
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
      household_id: user?.household_id,
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
        books,
        bookError,
        reloadBooks,
        recipes,
        mealPlans,
        shoppingItems,
        login,
        signUp,
        logout,
        createHouseholdInvite,
        joinHousehold,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        addBook,
        updateBook,
        deleteBook,
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

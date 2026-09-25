'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getWeekDates, cn } from '@/lib/utils';
import { MealType, ShoppingCategory } from '@/lib/types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Utensils, 
  Moon, 
  Coffee, 
  Cookie,
  X, 
  Check,
  ChefHat,
  Dices,
  Copy,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CalendarioPage() {
  const { 
    mealPlans, 
    recipes, 
    setMealPlan, 
    removeMealPlan, 
    clearWeekMeals,
    copyWeekMeals,
    autoFillWeekMeals,
    addIngredientsToShopping 
  } = useApp();
  
  // Control de semanas (desplazamiento en días)
  const [weekOffset, setWeekOffset] = useState(0);
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDates(baseDate);

  // Toggle para mostrar desayunos y meriendas (por defecto false para no sobrecargar)
  const [showAllMealTypes, setShowAllMealTypes] = useState(false);

  // Modal para asignar comida
  const [activeSlot, setActiveSlot] = useState<{ date: string; mealType: MealType; dayName: string } | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  // Modal para pasar ingredientes a la lista de compra
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<{ [key: string]: boolean }>({});
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Confirmación de vaciar semana
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // Notificación flotante de acciones rápidas
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Abrir modal de asignación
  const handleOpenSlot = (date: string, mealType: MealType, dayName: string) => {
    const existing = mealPlans.find((m) => m.date === date && m.meal_type === mealType);
    setCustomTitle(existing ? existing.title : '');
    setCustomNotes(existing?.notes || '');
    setSelectedRecipeId(existing?.recipe_id || '');
    setActiveSlot({ date, mealType, dayName });
  };

  const handleSaveMeal = async () => {
    if (!activeSlot) return;

    let titleToSave = customTitle.trim();
    let recipeIdToSave: string | undefined = undefined;

    if (selectedRecipeId) {
      const rec = recipes.find((r) => r.id === selectedRecipeId);
      if (rec) {
        titleToSave = rec.name;
        recipeIdToSave = rec.id;
      }
    }

    if (!titleToSave) return;

    await setMealPlan(activeSlot.date, activeSlot.mealType, titleToSave, recipeIdToSave, customNotes.trim() || undefined);
    setActiveSlot(null);
    setCustomTitle('');
    setCustomNotes('');
    setSelectedRecipeId('');
  };

  // Obtener fechas de la semana actual
  const currentWeekDateStrings = weekDays.map((d) => d.dateString);
  const weekMealPlans = mealPlans.filter((m) => currentWeekDateStrings.includes(m.date));
  
  // Recopilar ingredientes de las recetas planificadas
  const plannedIngredientsList: { key: string; name: string; quantity?: string; category?: ShoppingCategory; recipeName: string }[] = [];
  weekMealPlans.forEach((meal) => {
    if (meal.recipe_id) {
      const rec = recipes.find((r) => r.id === meal.recipe_id);
      if (rec && rec.ingredients) {
        rec.ingredients.forEach((ing, idx) => {
          plannedIngredientsList.push({
            key: `${meal.id}-${idx}-${ing.name}`,
            name: ing.name,
            quantity: ing.quantity,
            category: ing.category,
            recipeName: rec.name,
          });
        });
      }
    }
  });

  const handleOpenTransfer = () => {
    const initialMap: { [key: string]: boolean } = {};
    plannedIngredientsList.forEach((ing) => {
      initialMap[ing.key] = true;
    });
    setSelectedIngredients(initialMap);
    setTransferSuccess(null);
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    const toAdd = plannedIngredientsList.filter((ing) => selectedIngredients[ing.key]);
    if (toAdd.length === 0) return;

    const count = await addIngredientsToShopping(
      toAdd.map((i) => ({ name: i.name, quantity: i.quantity, category: i.category }))
    );

    setTransferSuccess(`¡${count} ingredientes añadidos a tu lista de la compra!`);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    });

    setTimeout(() => {
      setIsTransferModalOpen(false);
      setTransferSuccess(null);
    }, 1500);
  };

  // 1. Rellenar huecos automáticamente
  const handleAutoFill = async () => {
    const count = await autoFillWeekMeals(currentWeekDateStrings);
    if (count > 0) {
      showNotification(`🎲 Se han planificado ${count} comidas con tus recetas favoritas`);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.4 } });
    } else {
      showNotification('Todos los huecos ya están asignados o no hay recetas disponibles');
    }
  };

  // 2. Copiar a la semana siguiente
  const handleCopyNextWeek = async () => {
    const nextBase = new Date(baseDate);
    nextBase.setDate(nextBase.getDate() + 7);
    const nextWeekDays = getWeekDates(nextBase);
    const nextWeekDateStrings = nextWeekDays.map((d) => d.dateString);

    await copyWeekMeals(currentWeekDateStrings, nextWeekDateStrings);
    showNotification('📋 ¡Menú copiado a la semana siguiente!');
    setWeekOffset((prev) => prev + 1);
  };

  // 3. Vaciar semana actual
  const handleClearWeek = async () => {
    await clearWeekMeals(currentWeekDateStrings);
    setIsConfirmClearOpen(false);
    showNotification('🗑️ Menú de la semana vaciado');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8">
      
      {/* Notificación flotante */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-neutral-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. CABECERA Y ACCIONES RÁPIDAS */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Planificador de Comidas
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {weekMealPlans.length} platos planificados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Organiza tu semana y transfiere los ingredientes al súper con 1 solo clic
          </p>
        </div>

        {/* Barra de herramientas superior */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Navegador de Semanas */}
          <div className="flex items-center rounded-2xl border border-neutral-200/80 bg-white p-1 shadow-xs">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 text-xs font-bold text-neutral-700 hover:text-neutral-900"
            >
              {weekOffset === 0 ? 'Esta Semana' : weekOffset > 0 ? `+${weekOffset} sem.` : `${weekOffset} sem.`}
            </button>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
              title="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Botón Pasar a la compra */}
          <button
            onClick={handleOpenTransfer}
            disabled={plannedIngredientsList.length === 0}
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-40 transition"
            title="Añade ingredientes de los platos de la semana a la lista de compra"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Pasar a Compra ({plannedIngredientsList.length})</span>
          </button>

          {/* Rellenar inteligente */}
          <button
            onClick={handleAutoFill}
            className="flex items-center gap-1.5 rounded-2xl border border-neutral-200/80 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition"
            title="Rellenar días vacíos con tus recetas"
          >
            <Dices className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Rellenar</span>
          </button>

          {/* Copiar a la semana siguiente */}
          <button
            onClick={handleCopyNextWeek}
            disabled={weekMealPlans.length === 0}
            className="flex items-center gap-1.5 rounded-2xl border border-neutral-200/80 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 disabled:opacity-40 transition"
            title="Copiar este menú a la semana siguiente"
          >
            <Copy className="h-3.5 w-3.5 text-blue-500" />
            <span className="hidden sm:inline">Duplicar</span>
          </button>

          {/* Vaciar semana */}
          {weekMealPlans.length > 0 && (
            <button
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition"
              title="Vaciar menú de esta semana"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Toggle Desayunos y Meriendas */}
          <button
            onClick={() => setShowAllMealTypes(!showAllMealTypes)}
            className={cn(
              'flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold transition border',
              showAllMealTypes
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                : 'bg-white text-neutral-600 border-neutral-200/80 hover:bg-neutral-50'
            )}
          >
            <Coffee className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {showAllMealTypes ? '4 Comidas/Día' : 'Almuerzo & Cena'}
            </span>
          </button>

        </div>
      </div>

      {/* 2. PARRILLA DE DÍAS DE LA SEMANA */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {weekDays.map((day) => {
          const breakfast = mealPlans.find((m) => m.date === day.dateString && m.meal_type === 'desayuno');
          const lunch = mealPlans.find((m) => m.date === day.dateString && m.meal_type === 'almuerzo');
          const snack = mealPlans.find((m) => m.date === day.dateString && m.meal_type === 'merienda');
          const dinner = mealPlans.find((m) => m.date === day.dateString && m.meal_type === 'cena');

          return (
            <div
              key={day.dateString}
              className={cn(
                'flex flex-col rounded-3xl border bg-white p-4 transition-all duration-200 shadow-xs',
                day.isToday
                  ? 'border-emerald-400/80 ring-2 ring-emerald-500/10'
                  : 'border-neutral-200/80 hover:border-neutral-300'
              )}
            >
              {/* Cabecera del Día */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold', day.isToday ? 'text-emerald-700' : 'text-neutral-800')}>
                    {day.dayName}
                  </span>
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    day.isToday ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600'
                  )}>
                    {day.dayNumber}
                  </span>
                </div>
                {day.isToday && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Hoy
                  </span>
                )}
              </div>

              {/* Slots de Comida */}
              <div className="mt-3 flex flex-1 flex-col gap-2.5">
                
                {/* DESAYUNO (Opcional según toggle) */}
                {showAllMealTypes && (
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-2.5 transition hover:border-amber-200 hover:bg-amber-50/20">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-amber-700">
                      <span className="flex items-center gap-1">
                        <Coffee className="h-3 w-3" /> Desayuno
                      </span>
                      {breakfast && (
                        <button
                          onClick={() => removeMealPlan(breakfast.id)}
                          className="text-neutral-300 hover:text-red-500 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {breakfast ? (
                      <div
                        onClick={() => handleOpenSlot(day.dateString, 'desayuno', day.dayName)}
                        className="mt-1 cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-neutral-800 line-clamp-1">
                          {breakfast.title}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenSlot(day.dateString, 'desayuno', day.dayName)}
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-200 py-1 text-[10px] text-neutral-400 hover:text-neutral-600"
                      >
                        <Plus className="h-2.5 w-2.5" /> Añadir
                      </button>
                    )}
                  </div>
                )}

                {/* ALMUERZO (Principal) */}
                <div className="flex-1 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-3 transition hover:border-amber-200 hover:bg-amber-50/20">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
                    <span className="flex items-center gap-1">
                      <Utensils className="h-3 w-3" /> Almuerzo
                    </span>
                    {lunch && (
                      <button
                        onClick={() => removeMealPlan(lunch.id)}
                        className="text-neutral-300 hover:text-red-500 transition"
                        title="Eliminar plato"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {lunch ? (
                    <div
                      onClick={() => handleOpenSlot(day.dateString, 'almuerzo', day.dayName)}
                      className="mt-1.5 cursor-pointer"
                    >
                      <p className="text-xs font-bold text-neutral-800 line-clamp-2 hover:text-emerald-700 transition">
                        {lunch.title}
                      </p>
                      {lunch.notes && (
                        <p className="mt-0.5 text-[10px] text-neutral-400 line-clamp-1 italic">
                          &ldquo;{lunch.notes}&rdquo;
                        </p>
                      )}
                      {lunch.recipe_id && (
                        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                          <ChefHat className="h-2.5 w-2.5" /> Con receta
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenSlot(day.dateString, 'almuerzo', day.dayName)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-200 py-2.5 text-[11px] font-medium text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 transition"
                    >
                      <Plus className="h-3 w-3" /> Añadir comida
                    </button>
                  )}
                </div>

                {/* MERIENDA (Opcional según toggle) */}
                {showAllMealTypes && (
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-2.5 transition hover:border-orange-200 hover:bg-orange-50/20">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-orange-700">
                      <span className="flex items-center gap-1">
                        <Cookie className="h-3 w-3" /> Merienda
                      </span>
                      {snack && (
                        <button
                          onClick={() => removeMealPlan(snack.id)}
                          className="text-neutral-300 hover:text-red-500 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {snack ? (
                      <div
                        onClick={() => handleOpenSlot(day.dateString, 'merienda', day.dayName)}
                        className="mt-1 cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-neutral-800 line-clamp-1">
                          {snack.title}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenSlot(day.dateString, 'merienda', day.dayName)}
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-200 py-1 text-[10px] text-neutral-400 hover:text-neutral-600"
                      >
                        <Plus className="h-2.5 w-2.5" /> Añadir
                      </button>
                    )}
                  </div>
                )}

                {/* CENA (Principal) */}
                <div className="flex-1 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/20">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800">
                    <span className="flex items-center gap-1">
                      <Moon className="h-3 w-3" /> Cena
                    </span>
                    {dinner && (
                      <button
                        onClick={() => removeMealPlan(dinner.id)}
                        className="text-neutral-300 hover:text-red-500 transition"
                        title="Eliminar plato"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {dinner ? (
                    <div
                      onClick={() => handleOpenSlot(day.dateString, 'cena', day.dayName)}
                      className="mt-1.5 cursor-pointer"
                    >
                      <p className="text-xs font-bold text-neutral-800 line-clamp-2 hover:text-emerald-700 transition">
                        {dinner.title}
                      </p>
                      {dinner.notes && (
                        <p className="mt-0.5 text-[10px] text-neutral-400 line-clamp-1 italic">
                          &ldquo;{dinner.notes}&rdquo;
                        </p>
                      )}
                      {dinner.recipe_id && (
                        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                          <ChefHat className="h-2.5 w-2.5" /> Con receta
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenSlot(day.dateString, 'cena', day.dayName)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-200 py-2.5 text-[11px] font-medium text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 transition"
                    >
                      <Plus className="h-3 w-3" /> Añadir cena
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* 3. MODAL DE ASIGNACIÓN DE COMIDA */}
      {activeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Planificar {activeSlot.mealType.charAt(0).toUpperCase() + activeSlot.mealType.slice(1)}
                </h3>
                <p className="text-xs text-neutral-500">
                  {activeSlot.dayName}, {activeSlot.date}
                </p>
              </div>
              <button
                onClick={() => setActiveSlot(null)}
                className="rounded-xl p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Opción 1: Seleccionar de Recetas / Platos Habituales */}
            <div className="mt-4">
              <label className="text-xs font-bold text-neutral-700">
                Elegir de tus platos habituales:
              </label>
              <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {recipes.map((rec) => {
                  const isSelected = selectedRecipeId === rec.id;
                  return (
                    <div
                      key={rec.id}
                      onClick={() => {
                        setSelectedRecipeId(rec.id);
                        setCustomTitle(rec.name);
                      }}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-2xl p-2.5 text-xs transition',
                        isSelected
                          ? 'border-2 border-emerald-500 bg-emerald-50 font-bold text-emerald-900'
                          : 'border border-neutral-100 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
                      )}
                    >
                      <span>{rec.name}</span>
                      <span className="text-[10px] text-neutral-400 font-normal">
                        {rec.ingredients.length} ingr.
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opción 2: Escribir comida libremente */}
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <label className="text-xs font-bold text-neutral-700">
                O escribe cualquier plato al vuelo:
              </label>
              <input
                type="text"
                placeholder="Ej. Cenar fuera, Arroz con tomate, Pizza..."
                value={customTitle}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  setSelectedRecipeId('');
                }}
                className="mt-1.5 w-full rounded-2xl border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Notas / observaciones */}
            <div className="mt-3">
              <label className="text-xs font-bold text-neutral-700">Nota u observación (opcional):</label>
              <input
                type="text"
                placeholder="Ej. Comida para 2, Llevar táper al trabajo..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Botones de acción del Modal */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setActiveSlot(null)}
                className="rounded-2xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMeal}
                disabled={!customTitle.trim()}
                className="rounded-2xl bg-neutral-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE TRANSFERENCIA A LISTA DE LA COMPRA */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Añadir Ingredientes a la Compra
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Marca solo los que necesites comprar en el súper
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="rounded-xl p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {transferSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <p className="text-sm font-bold text-emerald-800">{transferSuccess}</p>
              </div>
            ) : (
              <>
                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {plannedIngredientsList.map((item) => {
                    const isChecked = !!selectedIngredients[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() =>
                          setSelectedIngredients((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                        }
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-2xl border p-2.5 text-xs transition',
                          isChecked
                            ? 'border-emerald-300 bg-emerald-50/50 text-neutral-900'
                            : 'border-neutral-100 bg-white text-neutral-400 opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded-lg text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-semibold">{item.name}</span>
                          {item.quantity && (
                            <span className="text-[11px] text-neutral-400">({item.quantity})</span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          para {item.recipeName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <span className="text-xs text-neutral-500">
                    {Object.values(selectedIngredients).filter(Boolean).length} ingredientes seleccionados
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsTransferModalOpen(false)}
                      className="rounded-2xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleExecuteTransfer}
                      className="rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-700"
                    >
                      Añadir a la Compra
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL CONFIRMACIÓN VACIAR SEMANA */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">¿Vaciar menú de esta semana?</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Se eliminarán las comidas asignadas a estos 7 días. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => setIsConfirmClearOpen(false)}
                className="rounded-2xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearWeek}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
              >
                Sí, vaciar semana
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

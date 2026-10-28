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
      colors: ['#b78d6d', '#a8c7d4', '#d8b192'],
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
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-2xl bg-[#80573d] px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-[#81746a] hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. CABECERA Y ACCIONES RÁPIDAS */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#f1e8e0] sm:text-3xl">
              Planificador de Comidas
            </h1>
            <span className="rounded-full bg-[#172431] px-2.5 py-0.5 text-xs font-bold text-[#a8c7d4]">
              {weekMealPlans.length} platos planificados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#a09288] mt-1">
            Organiza tu semana y transfiere los ingredientes al súper con 1 solo clic
          </p>
        </div>

        {/* Barra de herramientas superior */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Navegador de Semanas */}
          <div className="flex items-center rounded-2xl border border-[#3b2d24]/80 bg-[#191310] p-1 shadow-xs">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#a09288] hover:bg-[#211812] hover:text-[#f1e8e0] transition"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 text-xs font-bold text-[#c7b8ad] hover:text-[#f1e8e0]"
            >
              {weekOffset === 0 ? 'Esta Semana' : weekOffset > 0 ? `+${weekOffset} sem.` : `${weekOffset} sem.`}
            </button>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#a09288] hover:bg-[#211812] hover:text-[#f1e8e0] transition"
              title="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Botón Pasar a la compra */}
          <button
            onClick={handleOpenTransfer}
            disabled={plannedIngredientsList.length === 0}
            className="flex items-center gap-1.5 rounded-2xl bg-[#80573d] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-[#597b96]/20 hover:bg-[#80573d] disabled:opacity-40 transition"
            title="Añade ingredientes de los platos de la semana a la lista de compra"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Pasar a Compra ({plannedIngredientsList.length})</span>
          </button>

          {/* Rellenar inteligente */}
          <button
            onClick={handleAutoFill}
            className="flex items-center gap-1.5 rounded-2xl border border-[#3b2d24]/80 bg-[#191310] px-3 py-2 text-xs font-semibold text-[#c7b8ad] shadow-xs hover:bg-[#211812] transition"
            title="Rellenar días vacíos con tus recetas"
          >
            <Dices className="h-3.5 w-3.5 text-[#d8b192]" />
            <span className="hidden sm:inline">Rellenar</span>
          </button>

          {/* Copiar a la semana siguiente */}
          <button
            onClick={handleCopyNextWeek}
            disabled={weekMealPlans.length === 0}
            className="flex items-center gap-1.5 rounded-2xl border border-[#3b2d24]/80 bg-[#191310] px-3 py-2 text-xs font-semibold text-[#c7b8ad] shadow-xs hover:bg-[#211812] disabled:opacity-40 transition"
            title="Copiar este menú a la semana siguiente"
          >
            <Copy className="h-3.5 w-3.5 text-[#a8c7d4]" />
            <span className="hidden sm:inline">Duplicar</span>
          </button>

          {/* Vaciar semana */}
          {weekMealPlans.length > 0 && (
            <button
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#3b2d24]/80 bg-[#191310] text-[#81746a] hover:border-[#503638] hover:bg-[#291e1d] hover:text-[#e0aaa3] transition"
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
                ? 'bg-[#80573d] text-white border-[#3b2d24] shadow-xs'
                : 'bg-[#191310] text-[#b5a59a] border-[#3b2d24]/80 hover:bg-[#211812]'
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
                'flex flex-col rounded-3xl border bg-[#191310] p-4 transition-all duration-200 shadow-xs',
                day.isToday
                  ? 'border-[#344c61]/80 ring-2 ring-[#597b96]/10'
                  : 'border-[#3b2d24]/80 hover:border-[#3b2d24]'
              )}
            >
              {/* Cabecera del Día */}
              <div className="flex items-center justify-between border-b border-[#3b2d24] pb-3">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold', day.isToday ? 'text-[#a8c7d4]' : 'text-[#ded3c9]')}>
                    {day.dayName}
                  </span>
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    day.isToday ? 'bg-[#80573d] text-white' : 'bg-[#211812] text-[#b5a59a]'
                  )}>
                    {day.dayNumber}
                  </span>
                </div>
                {day.isToday && (
                  <span className="rounded-full bg-[#172431] px-2 py-0.5 text-[10px] font-bold text-[#a8c7d4]">
                    Hoy
                  </span>
                )}
              </div>

              {/* Slots de Comida */}
              <div className="mt-3 flex flex-1 flex-col gap-2.5">
                
                {/* DESAYUNO (Opcional según toggle) */}
                {showAllMealTypes && (
                  <div className="rounded-2xl border border-[#3b2d24] bg-[#211812]/50 p-2.5 transition hover:border-[#543c2c] hover:bg-[#302218]/20">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-[#d8b192]">
                      <span className="flex items-center gap-1">
                        <Coffee className="h-3 w-3" /> Desayuno
                      </span>
                      {breakfast && (
                        <button
                          onClick={() => removeMealPlan(breakfast.id)}
                          className="text-[#6e625a] hover:text-[#e0aaa3] transition"
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
                        <p className="text-xs font-semibold text-[#ded3c9] line-clamp-1">
                          {breakfast.title}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenSlot(day.dateString, 'desayuno', day.dayName)}
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#3b2d24] py-1 text-[10px] text-[#81746a] hover:text-[#b5a59a]"
                      >
                        <Plus className="h-2.5 w-2.5" /> Añadir
                      </button>
                    )}
                  </div>
                )}

                {/* ALMUERZO (Principal) */}
                <div className="flex-1 rounded-2xl border border-[#3b2d24] bg-[#211812]/60 p-3 transition hover:border-[#543c2c] hover:bg-[#302218]/20">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#d8b192]">
                    <span className="flex items-center gap-1">
                      <Utensils className="h-3 w-3" /> Almuerzo
                    </span>
                    {lunch && (
                      <button
                        onClick={() => removeMealPlan(lunch.id)}
                        className="text-[#6e625a] hover:text-[#e0aaa3] transition"
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
                      <p className="text-xs font-bold text-[#ded3c9] line-clamp-2 hover:text-[#a8c7d4] transition">
                        {lunch.title}
                      </p>
                      {lunch.notes && (
                        <p className="mt-0.5 text-[10px] text-[#81746a] line-clamp-1 italic">
                          &ldquo;{lunch.notes}&rdquo;
                        </p>
                      )}
                      {lunch.recipe_id && (
                        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#a8c7d4]">
                          <ChefHat className="h-2.5 w-2.5" /> Con receta
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenSlot(day.dateString, 'almuerzo', day.dayName)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#3b2d24] py-2.5 text-[11px] font-medium text-[#81746a] hover:border-[#3b2d24] hover:text-[#b5a59a] transition"
                    >
                      <Plus className="h-3 w-3" /> Añadir comida
                    </button>
                  )}
                </div>

                {/* MERIENDA (Opcional según toggle) */}
                {showAllMealTypes && (
                  <div className="rounded-2xl border border-[#3b2d24] bg-[#211812]/50 p-2.5 transition hover:border-[#543c2c] hover:bg-[#302218]/20">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-[#d8b192]">
                      <span className="flex items-center gap-1">
                        <Cookie className="h-3 w-3" /> Merienda
                      </span>
                      {snack && (
                        <button
                          onClick={() => removeMealPlan(snack.id)}
                          className="text-[#6e625a] hover:text-[#e0aaa3] transition"
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
                        <p className="text-xs font-semibold text-[#ded3c9] line-clamp-1">
                          {snack.title}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenSlot(day.dateString, 'merienda', day.dayName)}
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#3b2d24] py-1 text-[10px] text-[#81746a] hover:text-[#b5a59a]"
                      >
                        <Plus className="h-2.5 w-2.5" /> Añadir
                      </button>
                    )}
                  </div>
                )}

                {/* CENA (Principal) */}
                <div className="flex-1 rounded-2xl border border-[#3b2d24] bg-[#211812]/60 p-3 transition hover:border-[#344c61] hover:bg-[#172431]/20">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#a8c7d4]">
                    <span className="flex items-center gap-1">
                      <Moon className="h-3 w-3" /> Cena
                    </span>
                    {dinner && (
                      <button
                        onClick={() => removeMealPlan(dinner.id)}
                        className="text-[#6e625a] hover:text-[#e0aaa3] transition"
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
                      <p className="text-xs font-bold text-[#ded3c9] line-clamp-2 hover:text-[#a8c7d4] transition">
                        {dinner.title}
                      </p>
                      {dinner.notes && (
                        <p className="mt-0.5 text-[10px] text-[#81746a] line-clamp-1 italic">
                          &ldquo;{dinner.notes}&rdquo;
                        </p>
                      )}
                      {dinner.recipe_id && (
                        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#a8c7d4]">
                          <ChefHat className="h-2.5 w-2.5" /> Con receta
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenSlot(day.dateString, 'cena', day.dayName)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#3b2d24] py-2.5 text-[11px] font-medium text-[#81746a] hover:border-[#3b2d24] hover:text-[#b5a59a] transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080604]/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-[#3b2d24] bg-[#191310] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3b2d24] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#f1e8e0]">
                  Planificar {activeSlot.mealType.charAt(0).toUpperCase() + activeSlot.mealType.slice(1)}
                </h3>
                <p className="text-xs text-[#a09288]">
                  {activeSlot.dayName}, {activeSlot.date}
                </p>
              </div>
              <button
                onClick={() => setActiveSlot(null)}
                className="rounded-xl p-1 text-[#81746a] hover:bg-[#211812] hover:text-[#c7b8ad]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Opción 1: Seleccionar de Recetas / Platos Habituales */}
            <div className="mt-4">
              <label className="text-xs font-bold text-[#c7b8ad]">
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
                          ? 'border-2 border-[#344c61] bg-[#172431] font-bold text-[#a8c7d4]'
                          : 'border border-[#3b2d24] bg-[#211812] hover:bg-[#211812] text-[#c7b8ad]'
                      )}
                    >
                      <span>{rec.name}</span>
                      <span className="text-[10px] text-[#81746a] font-normal">
                        {rec.ingredients.length} ingr.
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opción 2: Escribir comida libremente */}
            <div className="mt-4 border-t border-[#3b2d24] pt-4">
              <label className="text-xs font-bold text-[#c7b8ad]">
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
                className="mt-1.5 w-full rounded-2xl border border-[#3b2d24] px-3.5 py-2.5 text-sm text-[#f1e8e0] focus:border-[#344c61] focus:outline-none focus:ring-2 focus:ring-[#597b96]/20"
              />
            </div>

            {/* Notas / observaciones */}
            <div className="mt-3">
              <label className="text-xs font-bold text-[#c7b8ad]">Nota u observación (opcional):</label>
              <input
                type="text"
                placeholder="Ej. Comida para 2, Llevar táper al trabajo..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[#3b2d24] px-3.5 py-2 text-xs text-[#f1e8e0] focus:border-[#344c61] focus:outline-none"
              />
            </div>

            {/* Botones de acción del Modal */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setActiveSlot(null)}
                className="rounded-2xl px-4 py-2 text-xs font-semibold text-[#b5a59a] hover:bg-[#211812]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMeal}
                disabled={!customTitle.trim()}
                className="rounded-2xl bg-[#80573d] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#93694b] disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE TRANSFERENCIA A LISTA DE LA COMPRA */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080604]/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-[#3b2d24] bg-[#191310] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3b2d24] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#172431] text-[#a8c7d4]">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f1e8e0]">
                    Añadir Ingredientes a la Compra
                  </h3>
                  <p className="text-xs text-[#81746a]">
                    Marca solo los que necesites comprar en el súper
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="rounded-xl p-1 text-[#81746a] hover:bg-[#211812] hover:text-[#c7b8ad]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {transferSuccess ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#172431] text-[#a8c7d4] mb-2">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <p className="text-sm font-bold text-[#a8c7d4]">{transferSuccess}</p>
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
                            ? 'border-[#344c61] bg-[#172431]/50 text-[#f1e8e0]'
                            : 'border-[#3b2d24] bg-[#191310] text-[#81746a] opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded-lg text-[#a8c7d4] focus:ring-[#597b96]"
                          />
                          <span className="font-semibold">{item.name}</span>
                          {item.quantity && (
                            <span className="text-[11px] text-[#81746a]">({item.quantity})</span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#81746a] font-medium">
                          para {item.recipeName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#3b2d24] pt-4">
                  <span className="text-xs text-[#a09288]">
                    {Object.values(selectedIngredients).filter(Boolean).length} ingredientes seleccionados
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsTransferModalOpen(false)}
                      className="rounded-2xl px-4 py-2 text-xs font-semibold text-[#b5a59a] hover:bg-[#211812]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleExecuteTransfer}
                      className="rounded-2xl bg-[#80573d] px-5 py-2 text-xs font-bold text-white shadow-sm shadow-[#597b96]/30 hover:bg-[#80573d]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080604]/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-[#3b2d24] bg-[#191310] p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#291e1d] text-[#e0aaa3] mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#f1e8e0]">¿Vaciar menú de esta semana?</h3>
            <p className="mt-1 text-xs text-[#a09288]">
              Se eliminarán las comidas asignadas a estos 7 días. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => setIsConfirmClearOpen(false)}
                className="rounded-2xl px-4 py-2 text-xs font-semibold text-[#b5a59a] hover:bg-[#211812]"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearWeek}
                className="rounded-2xl bg-[#623d3e] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#623d3e]"
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

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { 
  CalendarDays, 
  ShoppingCart, 
  ChefHat, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Sparkles,
  Utensils,
  ChevronRight,
} from 'lucide-react';
import { formatDateSpanish, cn } from '@/lib/utils';

export default function HomePage() {
  const { user, mealPlans, shoppingItems, toggleShoppingItem, addShoppingItem, recipes } = useApp();
  const [quickInput, setQuickInput] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayFormatted = formatDateSpanish(todayStr);

  // Comidas de hoy
  const todayLunch = mealPlans.find((m) => m.date === todayStr && m.meal_type === 'almuerzo');
  const todayDinner = mealPlans.find((m) => m.date === todayStr && m.meal_type === 'cena');

  // Estadísticas de compra
  const totalItems = shoppingItems.length;
  const boughtItems = shoppingItems.filter((i) => i.is_bought).length;
  const pendingItems = shoppingItems.filter((i) => !i.is_bought);
  const progressPercent = totalItems === 0 ? 0 : Math.round((boughtItems / totalItems) * 100);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    addShoppingItem(quickInput.trim());
    setQuickInput('');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
      
      {/* Banner de invitación a login si no ha iniciado sesión */}
      {!user && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Comparte la compra y comidas en tiempo real
              </p>
              <p className="text-[11px] text-emerald-700">
                Inicia sesión o regístrate para que tu lista se sincronice al instante con tu familia desde cualquier dispositivo.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            Iniciar Sesión / Registrarme
          </Link>
        </div>
      )}

      {/* 1. BIENVENIDA Y FECHA */}
      <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            Hoy es {todayFormatted}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            {user ? `¡Hola de nuevo! ¿Qué cocinamos hoy?` : `¡Hola! ¿Qué cocinamos hoy?`}
          </h1>
        </div>

        <Link
          href="/calendario"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-900"
        >
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          <span>Ver toda la semana</span>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        
        {/* 2. MENÚ DE HOY (Columna Izquierda / 7 columnas en desktop) */}
        <div className="space-y-6 md:col-span-7">
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Utensils className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900">Menú para hoy</h2>
              </div>
              <Link
                href="/calendario"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Editar menú
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {/* Almuerzo */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Almuerzo
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">14:00h aprox.</span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-base font-bold text-neutral-800">
                    {todayLunch ? todayLunch.title : 'Sin plato asignado'}
                  </h3>
                  {todayLunch?.notes && (
                    <p className="mt-1 text-xs text-neutral-500">{todayLunch.notes}</p>
                  )}
                  {!todayLunch && (
                    <Link
                      href="/calendario"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Elegir qué comer hoy
                    </Link>
                  )}
                </div>
              </div>

              {/* Cena */}
              <div className="group relative overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                      Cena
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">21:00h aprox.</span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-base font-bold text-neutral-800">
                    {todayDinner ? todayDinner.title : 'Sin plato asignado'}
                  </h3>
                  {todayDinner?.notes && (
                    <p className="mt-1 text-xs text-neutral-500">{todayDinner.notes}</p>
                  )}
                  {!todayDinner && (
                    <Link
                      href="/calendario"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Elegir cena ligera
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ideas rápidas de recetas */}
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ChefHat className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">Tus Platos Habituales</h3>
              </div>
              <Link href="/recetas" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                Ver todos ({recipes.length})
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {recipes.slice(0, 4).map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-3 text-left transition hover:border-neutral-200 hover:bg-neutral-100/70"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-semibold text-neutral-800">{recipe.name}</p>
                    <p className="text-[11px] text-neutral-400">
                      {recipe.ingredients.length} ingredientes
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-500 shadow-2xs border border-neutral-100">
                    {recipe.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. RESUMEN DE LA LISTA DE LA COMPRA (Columna Derecha / 5 columnas) */}
        <div className="space-y-6 md:col-span-5">
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Lista de la Compra</h2>
                  <p className="text-xs text-neutral-400">
                    {pendingItems.length} pendientes
                  </p>
                </div>
              </div>

              <Link
                href="/lista"
                className="flex items-center gap-1 rounded-2xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
              >
                <span>Ir a la lista</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Barra de progreso */}
            <div className="mt-5">
              <div className="flex justify-between text-xs font-semibold text-neutral-600 mb-1.5">
                <span>Progreso de compra</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Añadir producto rápido */}
            <form onSubmit={handleQuickAdd} className="mt-5 flex gap-2">
              <input
                type="text"
                placeholder="Añadir producto rápido..."
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <button
                type="submit"
                disabled={!quickInput.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            {/* Vista previa de artículos pendientes */}
            <div className="mt-4 space-y-2">
              {shoppingItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleShoppingItem(item.id)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-2xl p-2.5 transition-all',
                    item.is_bought
                      ? 'bg-neutral-50 text-neutral-400 line-through'
                      : 'border border-neutral-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/20'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.is_bought ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-neutral-300" />
                    )}
                    <span className="truncate text-sm font-medium">{item.name}</span>
                  </div>
                  {item.quantity && (
                    <span className="shrink-0 text-xs text-neutral-400">{item.quantity}</span>
                  )}
                </div>
              ))}

              {shoppingItems.length === 0 && (
                <div className="py-6 text-center text-xs text-neutral-400">
                  🎉 ¡No tienes nada pendiente de comprar!
                </div>
              )}
            </div>

            {/* Botón directo a "Modo Súper" */}
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <Link
                href="/lista?modo=super"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 transition"
              >
                <span>🛒 Abrir Modo &ldquo;En el Súper&rdquo;</span>
              </Link>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

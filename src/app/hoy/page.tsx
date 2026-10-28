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
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl border border-[#344c61] bg-[#172431]/60 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#80573d] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#a8c7d4]">
                Comparte la compra y comidas en tiempo real
              </p>
              <p className="text-[11px] text-[#a8c7d4]">
                Inicia sesión o regístrate para que tu lista se sincronice al instante con tu familia desde cualquier dispositivo.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="shrink-0 rounded-2xl bg-[#80573d] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#80573d] transition"
          >
            Iniciar Sesión / Registrarme
          </Link>
        </div>
      )}

      {/* 1. BIENVENIDA Y FECHA */}
      <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#172431] px-3 py-1 text-xs font-semibold text-[#a8c7d4]">
            <Sparkles className="h-3.5 w-3.5 text-[#a8c7d4]" />
            Hoy es {todayFormatted}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f1e8e0] sm:text-3xl">
            {user ? `¡Hola de nuevo! ¿Qué cocinamos hoy?` : `¡Hola! ¿Qué cocinamos hoy?`}
          </h1>
        </div>

        <Link
          href="/calendario"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#3b2d24] bg-[#191310] px-4 py-2 text-sm font-semibold text-[#c7b8ad] shadow-sm transition hover:bg-[#211812] hover:text-[#f1e8e0]"
        >
          <CalendarDays className="h-4 w-4 text-[#a8c7d4]" />
          <span>Ver toda la semana</span>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        
        {/* 2. MENÚ DE HOY (Columna Izquierda / 7 columnas en desktop) */}
        <div className="space-y-6 md:col-span-7">
          <div className="rounded-3xl border border-[#3b2d24]/80 bg-[#191310] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#3b2d24] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#302218] text-[#d8b192]">
                  <Utensils className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-[#f1e8e0]">Menú para hoy</h2>
              </div>
              <Link
                href="/calendario"
                className="text-xs font-semibold text-[#a8c7d4] hover:text-[#a8c7d4]"
              >
                Editar menú
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {/* Almuerzo */}
              <div className="group relative overflow-hidden rounded-2xl border border-[#3b2d24] bg-[#211812]/70 p-4 transition-all hover:border-[#344c61] hover:bg-[#172431]/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#302218] px-2.5 py-0.5 text-xs font-semibold text-[#d8b192]">
                      Almuerzo
                    </span>
                  </div>
                  <span className="text-xs text-[#81746a]">14:00h aprox.</span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-base font-bold text-[#ded3c9]">
                    {todayLunch ? todayLunch.title : 'Sin plato asignado'}
                  </h3>
                  {todayLunch?.notes && (
                    <p className="mt-1 text-xs text-[#a09288]">{todayLunch.notes}</p>
                  )}
                  {!todayLunch && (
                    <Link
                      href="/calendario"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a8c7d4] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Elegir qué comer hoy
                    </Link>
                  )}
                </div>
              </div>

              {/* Cena */}
              <div className="group relative overflow-hidden rounded-2xl border border-[#3b2d24] bg-[#211812]/70 p-4 transition-all hover:border-[#344c61] hover:bg-[#172431]/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#172431] px-2.5 py-0.5 text-xs font-semibold text-[#a8c7d4]">
                      Cena
                    </span>
                  </div>
                  <span className="text-xs text-[#81746a]">21:00h aprox.</span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-base font-bold text-[#ded3c9]">
                    {todayDinner ? todayDinner.title : 'Sin plato asignado'}
                  </h3>
                  {todayDinner?.notes && (
                    <p className="mt-1 text-xs text-[#a09288]">{todayDinner.notes}</p>
                  )}
                  {!todayDinner && (
                    <Link
                      href="/calendario"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a8c7d4] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Elegir cena ligera
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ideas rápidas de recetas */}
          <div className="rounded-3xl border border-[#3b2d24]/80 bg-[#191310] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#172431] text-[#a8c7d4]">
                  <ChefHat className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-[#f1e8e0]">Tus Platos Habituales</h3>
              </div>
              <Link href="/recetas" className="text-xs font-semibold text-[#a8c7d4] hover:text-[#a8c7d4]">
                Ver todos ({recipes.length})
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {recipes.slice(0, 4).map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between rounded-2xl border border-[#3b2d24] bg-[#211812]/50 p-3 text-left transition hover:border-[#3b2d24] hover:bg-[#211812]/70"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-semibold text-[#ded3c9]">{recipe.name}</p>
                    <p className="text-[11px] text-[#81746a]">
                      {recipe.ingredients.length} ingredientes
                    </p>
                  </div>
                  <span className="rounded-full bg-[#191310] px-2 py-0.5 text-[10px] font-medium text-[#a09288] shadow-2xs border border-[#3b2d24]">
                    {recipe.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. RESUMEN DE LA LISTA DE LA COMPRA (Columna Derecha / 5 columnas) */}
        <div className="space-y-6 md:col-span-5">
          <div className="rounded-3xl border border-[#3b2d24]/80 bg-[#191310] p-6 shadow-sm">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#80573d] text-white shadow-sm shadow-[#597b96]/30">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#f1e8e0]">Lista de la Compra</h2>
                  <p className="text-xs text-[#81746a]">
                    {pendingItems.length} pendientes
                  </p>
                </div>
              </div>

              <Link
                href="/lista"
                className="flex items-center gap-1 rounded-2xl bg-[#172431] px-3 py-1.5 text-xs font-bold text-[#a8c7d4] hover:bg-[#172431] transition"
              >
                <span>Ir a la lista</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Barra de progreso */}
            <div className="mt-5">
              <div className="flex justify-between text-xs font-semibold text-[#b5a59a] mb-1.5">
                <span>Progreso de compra</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#211812]">
                <div
                  className="h-full rounded-full bg-[#80573d] transition-all duration-500"
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
                className="flex-1 rounded-2xl border border-[#3b2d24] bg-[#211812] px-3.5 py-2 text-sm text-[#f1e8e0] placeholder:text-[#81746a] focus:border-[#344c61] focus:bg-[#191310] focus:outline-none focus:ring-2 focus:ring-[#597b96]/20 transition"
              />
              <button
                type="submit"
                disabled={!quickInput.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#80573d] text-white hover:bg-[#93694b] disabled:opacity-40 transition"
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
                      ? 'bg-[#211812] text-[#81746a] line-through'
                      : 'border border-[#3b2d24] bg-[#191310] hover:border-[#344c61] hover:bg-[#172431]/20'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.is_bought ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#a8c7d4]" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-[#6e625a]" />
                    )}
                    <span className="truncate text-sm font-medium">{item.name}</span>
                  </div>
                  {item.quantity && (
                    <span className="shrink-0 text-xs text-[#81746a]">{item.quantity}</span>
                  )}
                </div>
              ))}

              {shoppingItems.length === 0 && (
                <div className="py-6 text-center text-xs text-[#81746a]">
                  🎉 ¡No tienes nada pendiente de comprar!
                </div>
              )}
            </div>

            {/* Botón directo a "Modo Súper" */}
            <div className="mt-5 border-t border-[#3b2d24] pt-4">
              <Link
                href="/lista?modo=super"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#80573d] py-2.5 text-xs font-bold text-white shadow-sm shadow-[#597b96]/30 hover:bg-[#80573d] transition"
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

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
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl border border-[#354a3b] bg-[#19231d]/60 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#304b39] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#a8c5ae]">
                Comparte la compra y comidas en tiempo real
              </p>
              <p className="text-[11px] text-[#a8c5ae]">
                Inicia sesión o regístrate para que tu lista se sincronice al instante con tu familia desde cualquier dispositivo.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="shrink-0 rounded-2xl bg-[#385440] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#385440] transition"
          >
            Iniciar Sesión / Registrarme
          </Link>
        </div>
      )}

      {/* 1. BIENVENIDA Y FECHA */}
      <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#19231d] px-3 py-1 text-xs font-semibold text-[#a8c5ae]">
            <Sparkles className="h-3.5 w-3.5 text-[#a8c5ae]" />
            Hoy es {todayFormatted}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#edf0ed] sm:text-3xl">
            {user ? `¡Hola de nuevo! ¿Qué cocinamos hoy?` : `¡Hola! ¿Qué cocinamos hoy?`}
          </h1>
        </div>

        <Link
          href="/calendario"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#2b3430] bg-[#141a18] px-4 py-2 text-sm font-semibold text-[#c2cbc5] shadow-sm transition hover:bg-[#1a211e] hover:text-[#edf0ed]"
        >
          <CalendarDays className="h-4 w-4 text-[#a8c5ae]" />
          <span>Ver toda la semana</span>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        
        {/* 2. MENÚ DE HOY (Columna Izquierda / 7 columnas en desktop) */}
        <div className="space-y-6 md:col-span-7">
          <div className="rounded-3xl border border-[#2b3430]/80 bg-[#141a18] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#2b3430] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#282319] text-[#d5bc8c]">
                  <Utensils className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-[#edf0ed]">Menú para hoy</h2>
              </div>
              <Link
                href="/calendario"
                className="text-xs font-semibold text-[#a8c5ae] hover:text-[#a8c5ae]"
              >
                Editar menú
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {/* Almuerzo */}
              <div className="group relative overflow-hidden rounded-2xl border border-[#2b3430] bg-[#1a211e]/70 p-4 transition-all hover:border-[#354a3b] hover:bg-[#19231d]/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#282319] px-2.5 py-0.5 text-xs font-semibold text-[#d5bc8c]">
                      Almuerzo
                    </span>
                  </div>
                  <span className="text-xs text-[#7d8983]">14:00h aprox.</span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-base font-bold text-[#d7ded9]">
                    {todayLunch ? todayLunch.title : 'Sin plato asignado'}
                  </h3>
                  {todayLunch?.notes && (
                    <p className="mt-1 text-xs text-[#929d97]">{todayLunch.notes}</p>
                  )}
                  {!todayLunch && (
                    <Link
                      href="/calendario"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a8c5ae] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Elegir qué comer hoy
                    </Link>
                  )}
                </div>
              </div>

              {/* Cena */}
              <div className="group relative overflow-hidden rounded-2xl border border-[#2b3430] bg-[#1a211e]/70 p-4 transition-all hover:border-[#403b4d] hover:bg-[#211f28]/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#211f28] px-2.5 py-0.5 text-xs font-semibold text-[#beb5d4]">
                      Cena
                    </span>
                  </div>
                  <span className="text-xs text-[#7d8983]">21:00h aprox.</span>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-base font-bold text-[#d7ded9]">
                    {todayDinner ? todayDinner.title : 'Sin plato asignado'}
                  </h3>
                  {todayDinner?.notes && (
                    <p className="mt-1 text-xs text-[#929d97]">{todayDinner.notes}</p>
                  )}
                  {!todayDinner && (
                    <Link
                      href="/calendario"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a8c5ae] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Elegir cena ligera
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ideas rápidas de recetas */}
          <div className="rounded-3xl border border-[#2b3430]/80 bg-[#141a18] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#19231d] text-[#a8c5ae]">
                  <ChefHat className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-[#edf0ed]">Tus Platos Habituales</h3>
              </div>
              <Link href="/recetas" className="text-xs font-semibold text-[#a8c5ae] hover:text-[#a8c5ae]">
                Ver todos ({recipes.length})
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {recipes.slice(0, 4).map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center justify-between rounded-2xl border border-[#2b3430] bg-[#1a211e]/50 p-3 text-left transition hover:border-[#2b3430] hover:bg-[#1a211e]/70"
                >
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-semibold text-[#d7ded9]">{recipe.name}</p>
                    <p className="text-[11px] text-[#7d8983]">
                      {recipe.ingredients.length} ingredientes
                    </p>
                  </div>
                  <span className="rounded-full bg-[#141a18] px-2 py-0.5 text-[10px] font-medium text-[#929d97] shadow-2xs border border-[#2b3430]">
                    {recipe.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. RESUMEN DE LA LISTA DE LA COMPRA (Columna Derecha / 5 columnas) */}
        <div className="space-y-6 md:col-span-5">
          <div className="rounded-3xl border border-[#2b3430]/80 bg-[#141a18] p-6 shadow-sm">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#304b39] text-white shadow-sm shadow-emerald-500/30">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#edf0ed]">Lista de la Compra</h2>
                  <p className="text-xs text-[#7d8983]">
                    {pendingItems.length} pendientes
                  </p>
                </div>
              </div>

              <Link
                href="/lista"
                className="flex items-center gap-1 rounded-2xl bg-[#19231d] px-3 py-1.5 text-xs font-bold text-[#a8c5ae] hover:bg-[#19231d] transition"
              >
                <span>Ir a la lista</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Barra de progreso */}
            <div className="mt-5">
              <div className="flex justify-between text-xs font-semibold text-[#aab4ae] mb-1.5">
                <span>Progreso de compra</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#1a211e]">
                <div
                  className="h-full rounded-full bg-[#304b39] transition-all duration-500"
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
                className="flex-1 rounded-2xl border border-[#2b3430] bg-[#1a211e] px-3.5 py-2 text-sm text-[#edf0ed] placeholder:text-[#7d8983] focus:border-[#354a3b] focus:bg-[#141a18] focus:outline-none focus:ring-2 focus:ring-[#54745a]/20 transition"
              />
              <button
                type="submit"
                disabled={!quickInput.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#222b28] text-white hover:bg-[#303a36] disabled:opacity-40 transition"
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
                      ? 'bg-[#1a211e] text-[#7d8983] line-through'
                      : 'border border-[#2b3430] bg-[#141a18] hover:border-[#354a3b] hover:bg-[#19231d]/20'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.is_bought ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#a8c5ae]" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-[#68746e]" />
                    )}
                    <span className="truncate text-sm font-medium">{item.name}</span>
                  </div>
                  {item.quantity && (
                    <span className="shrink-0 text-xs text-[#7d8983]">{item.quantity}</span>
                  )}
                </div>
              ))}

              {shoppingItems.length === 0 && (
                <div className="py-6 text-center text-xs text-[#7d8983]">
                  🎉 ¡No tienes nada pendiente de comprar!
                </div>
              )}
            </div>

            {/* Botón directo a "Modo Súper" */}
            <div className="mt-5 border-t border-[#2b3430] pt-4">
              <Link
                href="/lista?modo=super"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#385440] py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/30 hover:bg-[#385440] transition"
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
